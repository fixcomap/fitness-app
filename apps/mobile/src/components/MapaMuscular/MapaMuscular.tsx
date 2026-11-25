// Mapa muscular: cuerpo masculino de frente y de espalda, lado a lado.
// Es el único lugar de la app que conoce react-native-body-highlighter; para
// cambiar el dibujo alcanza con reescribir este archivo.
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Body, { type ExtendedBodyPart } from 'react-native-body-highlighter';

import type { Musculo } from '../../data/tipos';
import { esMusculo, resaltarMusculos } from './datosMapa';

const COLOR_CUERPO = '#D9D9D9';
const COLOR_CONTORNO = '#8C8C8C';

// Tamaño base de cada figura en la librería, a escala 1.
const ANCHO_FIGURA = 200;

export interface MapaMuscularProps {
  musculosPrincipales?: readonly Musculo[];
  musculosSecundarios?: readonly Musculo[];
  onMusculoPress?: (musculo: Musculo) => void;
  // 1 = cada figura mide 200×400. Usá menos para la versión chica.
  escala?: number;
}

export function MapaMuscular({
  musculosPrincipales = [],
  musculosSecundarios = [],
  onMusculoPress,
  escala = 1,
}: MapaMuscularProps) {
  const datos = useMemo<ExtendedBodyPart[]>(
    () =>
      resaltarMusculos(musculosPrincipales, musculosSecundarios).map(({ slug, color }) => ({
        slug,
        styles: { fill: color },
      })),
    [musculosPrincipales, musculosSecundarios],
  );

  const alTocar = onMusculoPress
    ? (parte: ExtendedBodyPart) => {
        if (esMusculo(parte.slug)) onMusculoPress(parte.slug);
      }
    : undefined;

  const comunes = {
    data: datos,
    gender: 'male' as const,
    scale: escala,
    border: COLOR_CONTORNO,
    defaultFill: COLOR_CUERPO,
    defaultStroke: COLOR_CONTORNO,
    defaultStrokeWidth: 1,
    onBodyPartPress: alTocar,
  };

  return (
    <View
      style={[styles.contenedor, { width: ANCHO_FIGURA * escala * 2 }]}
      accessibilityRole="image"
      accessibilityLabel="Mapa muscular"
    >
      <Body {...comunes} side="front" />
      <Body {...comunes} side="back" />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexDirection: 'row', alignSelf: 'center', backgroundColor: 'transparent' },
});
