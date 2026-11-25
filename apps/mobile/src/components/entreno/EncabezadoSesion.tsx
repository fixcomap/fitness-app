import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espacios } from '../../theme/tema';

interface EncabezadoSesionProps {
  titulo: string;
  icono: 'close' | 'chevron-back';
  etiquetaBoton: string;
  onPress: () => void;
}

// Encabezado de las pantallas de la sesión, debajo de la barra de estado (respeta
// el margen de arriba también dentro de los modales).
export function EncabezadoSesion({ titulo, icono, etiquetaBoton, onPress }: EncabezadoSesionProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.encabezado, { paddingTop: insets.top + espacios.s }]}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
        accessibilityRole="button"
        accessibilityLabel={etiquetaBoton}
      >
        <Ionicons name={icono} size={22} color={colores.texto} />
      </Pressable>
      <Text style={styles.titulo} numberOfLines={1} accessibilityRole="header">
        {titulo}
      </Text>
      {/* Mismo ancho que el botón, para que el título quede centrado. */}
      <View style={styles.boton} />
    </View>
  );
}

const styles = StyleSheet.create({
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    paddingHorizontal: espacios.m,
    paddingBottom: espacios.s,
  },
  boton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  presionado: { backgroundColor: colores.tarjeta },
  titulo: { flex: 1, textAlign: 'center', color: colores.texto, fontSize: 17, fontWeight: '800' },
});
