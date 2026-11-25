import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import { colores, radios } from '../../theme/tema';
import { dimensionesVideo, FRACCION_ALTO_MAXIMO, type Medio } from './medio';

// Recuadro con el video del ejercicio: 16:9 para videos comunes y 9:16 (centrado,
// con un alto máximo) para Shorts.
export function MediaEjercicio({ medio }: { medio: Medio }) {
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  const { height: altoPantalla } = useWindowDimensions();
  const medir = (e: LayoutChangeEvent) => setAnchoDisponible(e.nativeEvent.layout.width);

  if (medio.tipo !== 'youtube') {
    return (
      <View style={[styles.marco, styles.vacio]}>
        <Ionicons name="videocam-outline" size={32} color={colores.textoSecundario} />
        <Text style={styles.textoVacio}>Video próximamente</Text>
      </View>
    );
  }

  const { ancho, alto } = dimensionesVideo(anchoDisponible, medio.formato, Math.round(altoPantalla * FRACCION_ALTO_MAXIMO));

  return (
    <View style={styles.contenedor} onLayout={medir}>
      {ancho > 0 ? (
        <View style={[styles.marco, { width: ancho, height: alto }]}>
          <YoutubePlayer height={alto} width={ancho} videoId={medio.videoId} />
        </View>
      ) : (
        <View style={[styles.marco, styles.cargando]}>
          <ActivityIndicator color={colores.acento} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { width: '100%', alignItems: 'center' },
  marco: {
    borderRadius: radios.grande,
    backgroundColor: colores.tarjeta,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargando: { width: '100%', aspectRatio: 16 / 9 },
  vacio: { width: '100%', aspectRatio: 16 / 9, gap: 8 },
  textoVacio: { color: colores.textoSecundario, fontSize: 15, fontWeight: '600' },
});
