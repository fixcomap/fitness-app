import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colores } from '../theme/tema';

export const AVISO_COACH = 'Soy un coach con IA. Puedo equivocarme y no reemplazo a un médico ni a un nutricionista.';
export const AVISO_FOTO = 'Estimación con IA: revisá las cantidades';

// Aviso chico y discreto de que lo que se ve lo generó una IA: texto secundario, no un cartel.
export function AvisoIa({ texto }: { texto: string }) {
  return (
    <View style={styles.aviso}>
      <Ionicons name="sparkles-outline" size={13} color={colores.textoSecundario} importantForAccessibility="no" />
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  texto: { flexShrink: 1, color: colores.textoSecundario, fontSize: 12, lineHeight: 16, textAlign: 'center' },
});
