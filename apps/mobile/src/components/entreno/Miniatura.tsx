import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

import type { Ejercicio } from '../../data/tipos';
import { colores, radios } from '../../theme/tema';
import { miniaturaVideo } from '../MediaEjercicio/medio';

// Cuadrado con la miniatura del video del ejercicio, o un ícono si no tiene.
export function Miniatura({
  ejercicio,
  tamano = 48,
  radio = radios.chico,
}: {
  ejercicio: Pick<Ejercicio, 'youtubeId'>;
  tamano?: number;
  radio?: number;
}) {
  const videoId = ejercicio.youtubeId.trim();
  return (
    <View style={[styles.marco, { width: tamano, height: tamano, borderRadius: radio }]}>
      {videoId ? (
        <Image source={{ uri: miniaturaVideo(videoId) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <Ionicons name="barbell-outline" size={tamano * 0.45} color={colores.textoSecundario} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    backgroundColor: colores.tarjetaElevada,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
