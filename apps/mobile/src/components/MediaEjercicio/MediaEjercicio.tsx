import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import { colores, radios } from '../../theme/tema';
import type { Medio } from './medio';

// Recuadro 16:9 con el video, el GIF o las imágenes del ejercicio.
export function MediaEjercicio({ medio }: { medio: Medio }) {
  const [ancho, setAncho] = useState(0);
  const alto = Math.round((ancho * 9) / 16);
  const medir = (e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width);

  return (
    <View style={[styles.marco, { aspectRatio: 16 / 9 }]} onLayout={medir}>
      {medio.tipo === 'youtube' ? (
        ancho > 0 ? (
          <YoutubePlayer height={alto} width={ancho} videoId={medio.videoId} />
        ) : (
          <ActivityIndicator color={colores.acento} />
        )
      ) : (
        <View style={styles.vacio}>
          <Ionicons name="videocam-outline" size={32} color={colores.textoSecundario} />
          <Text style={styles.textoVacio}>Video próximamente</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    width: '100%',
    borderRadius: radios.grande,
    backgroundColor: colores.tarjeta,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: { alignItems: 'center', gap: 8 },
  textoVacio: { color: colores.textoSecundario, fontSize: 15, fontWeight: '600' },
});
