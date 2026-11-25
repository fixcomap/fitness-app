import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colores, espacios } from '../../theme/tema';
import { coloresSesion, medidasSesion } from './estiloSesion';

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
        style={({ pressed }) => [styles.boton, styles.botonRelleno, pressed && styles.presionado]}
        accessibilityRole="button"
        accessibilityLabel={etiquetaBoton}
      >
        <Ionicons name={icono} size={20} color={colores.texto} />
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
  boton: {
    width: medidasSesion.botonRedondo,
    height: medidasSesion.botonRedondo,
    borderRadius: medidasSesion.botonRedondo / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonRelleno: { backgroundColor: coloresSesion.superficie },
  presionado: { opacity: 0.8 },
  titulo: { flex: 1, textAlign: 'center', color: colores.texto, fontSize: 17, fontWeight: '800' },
});
