import { StyleSheet, View } from 'react-native';

import { segmentosLlenos } from '../../lib/resumenDia';
import { colores } from '../../theme/tema';

const ALTO = 5;

export function BarraProgreso({ porcentaje, color = colores.acento }: { porcentaje: number; color?: string }) {
  const p = Math.max(0, Math.min(100, porcentaje));
  return (
    <View style={styles.pista}>
      <View style={[styles.relleno, { width: `${p}%`, backgroundColor: color }]} />
    </View>
  );
}

export function BarraSegmentada({ porcentaje, segmentos = 4 }: { porcentaje: number; segmentos?: number }) {
  const llenos = segmentosLlenos(porcentaje, segmentos);
  return (
    <View style={styles.fila}>
      {Array.from({ length: segmentos }, (_, i) => (
        <View key={i} style={[styles.segmento, { backgroundColor: i < llenos ? colores.acento : colores.pista }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pista: { height: ALTO, borderRadius: ALTO / 2, backgroundColor: colores.pista, overflow: 'hidden' },
  relleno: { height: ALTO, borderRadius: ALTO / 2 },
  fila: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: ALTO, borderRadius: ALTO / 2 },
});
