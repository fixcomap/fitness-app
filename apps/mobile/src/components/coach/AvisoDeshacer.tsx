import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAhora } from '../../hooks/useAhora';
import { segundosRestantes } from '../../lib/coach/tarjeta';
import { colores, radios } from '../../theme/tema';

interface AvisoDeshacerProps {
  titulo: string; // lo que se aplicó
  vence: number; // ms: cuándo deja de poder deshacerse
  onDeshacer: () => void;
}

// Abajo, después de aplicar: qué se aplicó y Deshacer con la cuenta de 6 s.
export function AvisoDeshacer({ titulo, vence, onDeshacer }: AvisoDeshacerProps) {
  const ahora = useAhora(250);
  const segundos = segundosRestantes(vence, ahora);
  if (segundos === 0) return null;
  return (
    <View style={styles.aviso} accessibilityLiveRegion="polite">
      <Ionicons name="checkmark-circle" size={20} color={colores.verde} />
      <Text style={styles.texto} numberOfLines={2}>
        Aplicado: {titulo}
      </Text>
      <Pressable
        onPress={onDeshacer}
        hitSlop={8}
        style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
        accessibilityRole="button"
        accessibilityLabel={`Deshacer, quedan ${segundos} segundos`}
      >
        <Text style={styles.textoBoton}>Deshacer · {segundos}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 6,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: radios.medio,
    backgroundColor: colores.tarjetaElevada,
  },
  texto: { flex: 1, color: colores.texto, fontSize: 14, fontWeight: '600' },
  boton: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radios.pill,
    backgroundColor: colores.texto,
    justifyContent: 'center',
  },
  presionado: { opacity: 0.85 },
  textoBoton: { color: colores.textoSobreAcento, fontSize: 14, fontWeight: '800' },
});
