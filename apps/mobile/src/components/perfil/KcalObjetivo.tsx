import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { avisoKcal, KCAL_PERSONALIZADAS, leerKcalPersonalizadas, type Sexo } from '../../lib/calorias';
import { formatearNumero } from '../../lib/formato';
import { colores, espacios, radios } from '../../theme/tema';

interface KcalObjetivoProps {
  recomendadas: number;
  personalizadas: number | null;
  sexo: Sexo;
  onCambiar: (kcal: number | null) => void; // null: volver al recomendado
}

// Objetivo de kcal: el recomendado o uno personalizado (con aviso si es muy bajo).
export function KcalObjetivo({ recomendadas, personalizadas, sexo, onCambiar }: KcalObjetivoProps) {
  const [texto, setTexto] = useState<string | null>(null); // null = no se está editando
  const [invalido, setInvalido] = useState(false);

  const escrito = texto === null ? null : leerKcalPersonalizadas(texto);
  const aviso = avisoKcal(texto === null ? (personalizadas ?? recomendadas) : (escrito ?? Infinity), sexo);

  const guardar = () => {
    if (escrito === null) return setInvalido(true);
    onCambiar(escrito);
    setTexto(null);
    setInvalido(false);
  };

  return (
    <View style={styles.contenedor}>
      {texto === null ? (
        <View style={styles.fila}>
          <View style={styles.flex}>
            <Text style={styles.etiqueta}>{personalizadas === null ? 'Recomendado' : 'Personalizado'}</Text>
            <Text style={styles.valor}>{formatearNumero(personalizadas ?? recomendadas)} kcal</Text>
          </View>
          <Pressable
            onPress={() => setTexto(String(personalizadas ?? recomendadas))}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.accion}>Personalizar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.editor}>
          <Text style={styles.etiqueta}>Kcal por día</Text>
          <View style={styles.fila}>
            <View style={[styles.entrada, invalido && styles.entradaError]}>
              <TextInput
                value={texto}
                onChangeText={(t) => {
                  setTexto(t);
                  setInvalido(false);
                }}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                onSubmitEditing={guardar}
                style={styles.input}
                accessibilityLabel="Kcal por día"
              />
              <Text style={styles.unidad}>kcal</Text>
            </View>
            <Pressable onPress={guardar} style={styles.boton} accessibilityRole="button">
              <Text style={styles.textoBoton}>Guardar</Text>
            </Pressable>
          </View>
          <Text style={[styles.ayuda, invalido && styles.error]}>
            Entre {formatearNumero(KCAL_PERSONALIZADAS.min)} y {formatearNumero(KCAL_PERSONALIZADAS.max)}. Recomendado:{' '}
            {formatearNumero(recomendadas)} kcal.
          </Text>
        </View>
      )}

      {texto === null && personalizadas !== null && (
        <Text style={styles.ayuda}>
          Recomendado: {formatearNumero(recomendadas)} kcal ·{' '}
          <Text style={styles.accion} onPress={() => onCambiar(null)} accessibilityRole="button" suppressHighlighting>
            Volver al recomendado
          </Text>
        </Text>
      )}

      {aviso && (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Text style={styles.textoAviso}>{aviso}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenedor: { gap: espacios.s + 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacios.s },
  editor: { gap: espacios.s },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  valor: { color: colores.texto, fontSize: 20, fontWeight: '800', marginTop: 2 },
  accion: { color: colores.acento, fontSize: 15, fontWeight: '700' },
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
  ayuda: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  error: { color: colores.acentoSuave },
  aviso: {
    borderRadius: radios.medio,
    borderWidth: 1,
    borderColor: colores.acento,
    padding: espacios.s + 4,
  },
  textoAviso: { color: colores.texto, fontSize: 13, lineHeight: 19 },
});
