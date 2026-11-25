import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatearCronometro } from '../../lib/entreno/resumen';
import { AJUSTE_DESCANSO_S } from '../../lib/entreno/sesion';
import { colores, espacios, radios } from '../../theme/tema';

interface BarraDescansoProps {
  segundos: number;
  onAjustar: (deltaS: number) => void;
  onSaltar: () => void;
}

// Temporizador de descanso: cuenta regresiva con −15, +15 y Saltar.
export function BarraDescanso({ segundos, onAjustar, onSaltar }: BarraDescansoProps) {
  return (
    <View style={styles.barra} accessibilityLiveRegion="polite">
      <View style={styles.flex}>
        <Text style={styles.etiqueta}>Descanso</Text>
        <Text style={styles.tiempo}>{formatearCronometro(segundos * 1000)}</Text>
      </View>
      <Boton texto={`−${AJUSTE_DESCANSO_S}`} etiqueta={`Restar ${AJUSTE_DESCANSO_S} segundos`} onPress={() => onAjustar(-AJUSTE_DESCANSO_S)} />
      <Boton texto={`+${AJUSTE_DESCANSO_S}`} etiqueta={`Sumar ${AJUSTE_DESCANSO_S} segundos`} onPress={() => onAjustar(AJUSTE_DESCANSO_S)} />
      <Boton texto="Saltar" etiqueta="Saltar descanso" onPress={onSaltar} destacado />
    </View>
  );
}

function Boton({ texto, etiqueta, onPress, destacado = false }: { texto: string; etiqueta: string; onPress: () => void; destacado?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.boton, destacado && styles.botonDestacado, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Text style={[styles.textoBoton, destacado && styles.textoDestacado]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    backgroundColor: colores.tarjetaElevada,
    borderRadius: radios.medio,
    paddingHorizontal: espacios.m,
    paddingVertical: espacios.s + 2,
  },
  flex: { flex: 1 },
  etiqueta: { color: colores.textoSecundario, fontSize: 12, fontWeight: '700' },
  tiempo: { color: colores.texto, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  boton: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: 10,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDestacado: { backgroundColor: colores.texto },
  presionado: { opacity: 0.8 },
  textoBoton: { color: colores.texto, fontSize: 14, fontWeight: '800' },
  textoDestacado: { color: colores.textoSobreAcento },
});
