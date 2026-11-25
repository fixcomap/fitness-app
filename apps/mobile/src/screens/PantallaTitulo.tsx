import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores, espacios } from '../theme/tema';

// Pantalla provisoria: solo muestra su título hasta que tenga contenido.
export function PantallaTitulo({ titulo }: { titulo: string }) {
  return (
    <SafeAreaView style={styles.contenedor} edges={['top']}>
      <Text style={styles.titulo}>{titulo}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo, paddingHorizontal: espacios.m },
  titulo: { color: colores.texto, fontSize: 34, fontWeight: '800', marginTop: espacios.m },
});
