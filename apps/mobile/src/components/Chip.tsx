import { Pressable, StyleSheet, Text } from 'react-native';

import { colores, espacios, radios } from '../theme/tema';

interface ChipProps {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Chip({ texto, activo = false, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={onPress ? { selected: activo } : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.chip, activo && styles.activo, pressed && styles.presionado]}
    >
      <Text style={[styles.texto, activo && styles.textoActivo]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: espacios.s,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  activo: { backgroundColor: colores.acento, borderColor: colores.acento },
  presionado: { opacity: 0.7 },
  texto: { color: colores.textoSecundario, fontWeight: '600', fontSize: 14 },
  textoActivo: { color: colores.texto },
});
