import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Fitness app</Text>
      <Text style={styles.texto}>Esqueleto inicial</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center' },
  titulo: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  texto: { color: '#9A9A9A', marginTop: 8 },
});
