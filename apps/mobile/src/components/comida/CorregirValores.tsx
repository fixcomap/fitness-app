import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Nutrientes } from '../../lib/comida/alimentos';
import {
  borradorDeValores,
  CAMPOS_VALOR,
  erroresValores,
  valoresDesdeBorrador,
  type BorradorValores,
  type CampoValor,
} from '../../lib/comida/aproximados';
import { colores, radios } from '../../theme/tema';

const ETIQUETA: Record<CampoValor, string> = { kcal: 'kcal', proteinas: 'Proteínas (g)', carbos: 'Carbos (g)', grasas: 'Grasas (g)' };

interface CorregirValoresProps {
  inicial: Nutrientes;
  onGuardar: (valores: Nutrientes) => void;
  onVolver: () => void;
}

// Los valores cada 100 g de un alimento aproximado, para corregirlos (por ejemplo, con la etiqueta).
export function CorregirValores({ inicial, onGuardar, onVolver }: CorregirValoresProps) {
  const [borrador, setBorrador] = useState<BorradorValores>(() => borradorDeValores(inicial));
  const [intentado, setIntentado] = useState(false);
  const errores = erroresValores(borrador);

  const guardar = () => {
    setIntentado(true);
    const valores = valoresDesdeBorrador(borrador);
    if (valores) onGuardar(valores);
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.ayuda}>
        Cada 100 g. Se corrige en todo tu diario y la próxima vez el coach usa estos valores.
      </Text>
      <View style={styles.grilla}>
        {CAMPOS_VALOR.map((campo) => {
          const error = intentado ? errores[campo] : undefined;
          return (
            <View key={campo} style={styles.campo}>
              <Text style={styles.etiqueta}>{ETIQUETA[campo]}</Text>
              <TextInput
                value={borrador[campo]}
                onChangeText={(t) => setBorrador((b) => ({ ...b, [campo]: t }))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                maxLength={6}
                style={[styles.entrada, error && styles.entradaError]}
                accessibilityLabel={`${ETIQUETA[campo]} cada 100 gramos`}
              />
              {error && <Text style={styles.error}>{error}</Text>}
            </View>
          );
        })}
      </View>
      <View style={styles.botones}>
        <Pressable
          onPress={onVolver}
          style={({ pressed }) => [styles.boton, styles.botonVolver, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>Volver</Text>
        </Pressable>
        <Pressable
          onPress={guardar}
          style={({ pressed }) => [styles.boton, styles.botonGuardar, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>Guardar valores</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 14 },
  ayuda: { color: colores.textoSecundario, fontSize: 13, lineHeight: 18 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  campo: { width: '47%', gap: 6 },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  entrada: {
    height: 48,
    borderRadius: radios.chico,
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingHorizontal: 12,
    color: colores.texto,
    fontSize: 18,
    fontWeight: '700',
  },
  entradaError: { borderColor: colores.acento },
  error: { color: colores.acentoSuave, fontSize: 12, lineHeight: 16 },
  botones: { flexDirection: 'row', gap: 10 },
  boton: { flex: 1, height: 50, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  botonVolver: { backgroundColor: colores.tarjetaElevada },
  botonGuardar: { backgroundColor: colores.acento },
  presionado: { opacity: 0.85 },
  textoBoton: { color: colores.texto, fontSize: 16, fontWeight: '800' },
});
