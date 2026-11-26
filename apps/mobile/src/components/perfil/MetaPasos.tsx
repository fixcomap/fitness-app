import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { META_PASOS_MAXIMA, META_PASOS_MINIMA } from '../../lib/configuracion';
import { formatearNumero } from '../../lib/formato';
import { colores, espacios, radios } from '../../theme/tema';

interface MetaPasosProps {
  meta: number;
  onCambiar: (valor: number) => number | null; // la meta guardada, o null si no es válida
}

// Meta diaria de pasos: se toca "Cambiar", se escribe y se guarda.
export function MetaPasos({ meta, onCambiar }: MetaPasosProps) {
  const [texto, setTexto] = useState<string | null>(null); // null = no se está editando
  const [invalida, setInvalida] = useState(false);

  const guardar = () => {
    if (texto === null) return;
    const guardada = onCambiar(Number(texto.replace(/\./g, '')));
    if (guardada === null) return setInvalida(true);
    setTexto(null);
    setInvalida(false);
  };

  if (texto === null) {
    return (
      <Pressable onPress={() => setTexto(String(meta))} style={styles.fila} accessibilityRole="button">
        <View style={styles.flex}>
          <Text style={styles.etiqueta}>Meta diaria de pasos</Text>
          <Text style={styles.valor}>{formatearNumero(meta)}</Text>
        </View>
        <Text style={styles.cambiar}>Cambiar</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.editor}>
      <Text style={styles.etiqueta}>Meta diaria de pasos</Text>
      <View style={styles.fila}>
        <View style={[styles.entrada, invalida && styles.entradaError]}>
          <TextInput
            value={texto}
            onChangeText={(t) => {
              setTexto(t);
              setInvalida(false);
            }}
            keyboardType="number-pad"
            autoFocus
            selectTextOnFocus
            onSubmitEditing={guardar}
            style={styles.input}
            accessibilityLabel="Meta diaria de pasos"
          />
          <Text style={styles.unidad}>pasos</Text>
        </View>
        <Pressable onPress={guardar} style={styles.boton} accessibilityRole="button">
          <Text style={styles.textoBoton}>Guardar</Text>
        </Pressable>
      </View>
      <Text style={[styles.ayuda, invalida && styles.error]}>
        Entre {formatearNumero(META_PASOS_MINIMA)} y {formatearNumero(META_PASOS_MAXIMA)}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacios.s },
  editor: { gap: espacios.s },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  valor: { color: colores.texto, fontSize: 20, fontWeight: '800', marginTop: 2 },
  cambiar: { color: colores.acento, fontSize: 15, fontWeight: '700' },
  entrada: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radios.medio,
    borderWidth: 1.5,
    borderColor: colores.tarjetaElevada,
    backgroundColor: colores.tarjetaElevada,
    paddingHorizontal: espacios.m - 4,
  },
  entradaError: { borderColor: colores.acento },
  input: { flex: 1, color: colores.texto, fontSize: 18, fontWeight: '800', padding: 0 },
  unidad: { color: colores.textoSecundario, fontSize: 14 },
  boton: {
    height: 48,
    paddingHorizontal: espacios.m,
    borderRadius: radios.medio,
    backgroundColor: colores.acento,
    justifyContent: 'center',
  },
  textoBoton: { color: colores.texto, fontSize: 15, fontWeight: '800' },
  ayuda: { color: colores.textoSecundario, fontSize: 13 },
  error: { color: colores.acentoSuave },
});
