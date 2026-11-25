import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

import type { ParImagenes } from '../../data/imagenesEjercicios';
import { colores, radios } from '../../theme/tema';
import {
  dimensionesVideo,
  FRACCION_ALTO_MAXIMO,
  INTERVALO_IMAGENES_MS,
  miniaturaVideo,
  siguienteImagen,
  type Medio,
} from './medio';

// El HTML de react-native-youtube-iframe fija el contenedor del iframe en 16:9 del ancho
// (padding-bottom: 56.25%), así que un Short en un recuadro 9:16 quedaba en la franja de
// arriba. Esto hace que el contenedor y el iframe ocupen todo el WebView.
const AJUSTE_IFRAME = `(function () {
  var css = 'html,body{height:100%;margin:0;background:#000}' +
    '.container{height:100vh!important;padding-bottom:0!important}' +
    '.container iframe{position:absolute;top:0;left:0;width:100%!important;height:100%!important}';
  var estilo = document.createElement('style');
  estilo.appendChild(document.createTextNode(css));
  document.head.appendChild(estilo);
})();
true;`;

// Recuadro con el video del ejercicio: 16:9 para videos comunes y 9:16 (centrado,
// con un alto máximo) para Shorts.
export function MediaEjercicio({ medio }: { medio: Medio }) {
  const [anchoDisponible, setAnchoDisponible] = useState(0);
  const [idCargado, setIdCargado] = useState<string | null>(null);
  const { height: altoPantalla } = useWindowDimensions();
  const medir = (e: LayoutChangeEvent) => setAnchoDisponible(e.nativeEvent.layout.width);

  if (medio.tipo === 'imagenes') return <ImagenesAlternadas imagenes={medio.imagenes} />;

  if (medio.tipo !== 'youtube') {
    return (
      <View style={[styles.marco, styles.vacio]}>
        <Ionicons name="videocam-outline" size={32} color={colores.textoSecundario} />
        <Text style={styles.textoVacio}>Video próximamente</Text>
      </View>
    );
  }

  const { ancho, alto } = dimensionesVideo(anchoDisponible, medio.formato, Math.round(altoPantalla * FRACCION_ALTO_MAXIMO));
  // El reproductor (un WebView) recién se crea al tocar la miniatura, así el
  // detalle abre rápido. Se guarda el id para volver a la miniatura si cambia el video.
  const cargado = idCargado === medio.videoId;

  return (
    <View style={styles.contenedor} onLayout={medir}>
      {ancho > 0 ? (
        <View style={[styles.marco, styles.negro, { width: ancho, height: alto }]}>
          {cargado ? (
            <YoutubePlayer
              height={alto}
              width={ancho}
              videoId={medio.videoId}
              play
              webViewStyle={styles.negro}
              webViewProps={{ injectedJavaScript: AJUSTE_IFRAME }}
            />
          ) : (
            <Pressable
              style={styles.miniatura}
              onPress={() => setIdCargado(medio.videoId)}
              accessibilityRole="button"
              accessibilityLabel="Reproducir video"
            >
              <Image source={{ uri: miniaturaVideo(medio.videoId) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.play}>
                <Ionicons name="play" size={30} color={colores.texto} style={styles.iconoPlay} />
              </View>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={[styles.marco, styles.cargando]}>
          <ActivityIndicator color={colores.acento} />
        </View>
      )}
    </View>
  );
}

// Inicio y fin del movimiento, alternándose cada INTERVALO_IMAGENES_MS.
function ImagenesAlternadas({ imagenes }: { imagenes: ParImagenes }) {
  const [indice, setIndice] = useState<0 | 1>(0);

  useEffect(() => {
    const intervalo = setInterval(() => setIndice(siguienteImagen), INTERVALO_IMAGENES_MS);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <View
      style={[styles.marco, styles.imagenes]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Posición inicial y final del ejercicio"
    >
      <Image source={imagenes[indice]} style={StyleSheet.absoluteFill} resizeMode="contain" />
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
  negro: { backgroundColor: '#000' },
  miniatura: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoPlay: { marginLeft: 4 },
  cargando: { width: '100%', aspectRatio: 16 / 9 },
  vacio: { width: '100%', aspectRatio: 16 / 9, gap: 8 },
  imagenes: { width: '100%', aspectRatio: 16 / 9 },
  textoVacio: { color: colores.textoSecundario, fontSize: 15, fontWeight: '600' },
});
