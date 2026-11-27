import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ItemPropuesto } from '../../lib/coach/editar';
import { esAproximado, subtituloAlimento } from '../../lib/comida/alimentos';
import { nutrientesCantidad, sumarNutrientes } from '../../lib/comida/porciones';
import { formatearNumero } from '../../lib/formato';
import { colores, radios } from '../../theme/tema';
import { ControlPorcion } from '../comida/ControlPorcion';

interface HojaEditarComidaProps {
  // null = cerrada. Los ítems que propuso el coach, con el alimento que se va a cargar.
  abierta: { titulo: string; items: ItemPropuesto[] } | null;
  error: string | null; // por qué no se pudo aplicar
  onAplicar: (items: ItemPropuesto[]) => void;
  onCerrar: () => void;
}

// La comida que propone el coach, para ajustar cuánto de cada cosa antes de cargarla.
export function HojaEditarComida({ abierta, error, onAplicar, onCerrar }: HojaEditarComidaProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={abierta !== null} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.manija} />
        {abierta && <Contenido titulo={abierta.titulo} inicial={abierta.items} error={error} onAplicar={onAplicar} onCerrar={onCerrar} />}
      </View>
    </Modal>
  );
}

function Contenido({
  titulo,
  inicial,
  error,
  onAplicar,
  onCerrar,
}: {
  titulo: string;
  inicial: ItemPropuesto[];
  error: string | null;
  onAplicar: (items: ItemPropuesto[]) => void;
  onCerrar: () => void;
}) {
  const [items, setItems] = useState(inicial);
  const kcal = sumarNutrientes(items.map((i) => nutrientesCantidad(i.alimento, i.cantidad))).kcal;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido}>
      <View style={styles.encabezado}>
        <Text style={[styles.titulo, styles.flex]}>{titulo}</Text>
        <Pressable onPress={onCerrar} hitSlop={8} style={styles.cerrar} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Ionicons name="close" size={20} color={colores.texto} />
        </Pressable>
      </View>

      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.nombre}>{item.alimento.nombre}</Text>
          <Text style={styles.subtitulo}>
            {subtituloAlimento(item.alimento)}
            {esAproximado(item.alimento) ? ' · valores estimados por el coach' : ''}
          </Text>
          <ControlPorcion
            alimento={item.alimento}
            cantidad={item.cantidad}
            onCambiar={(cantidad) => setItems((actuales) => actuales.map((x, j) => (j === i ? { ...x, cantidad } : x)))}
          />
        </View>
      ))}

      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <Pressable
        onPress={() => onAplicar(items)}
        style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
        accessibilityRole="button"
      >
        <Text style={styles.textoBoton}>Guardar y aplicar</Text>
        <Text style={styles.textoBoton}>{formatearNumero(kcal)} kcal</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  presionado: { opacity: 0.85 },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: { backgroundColor: colores.tarjeta, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  manija: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#444', marginTop: 10 },
  contenido: { padding: 20, gap: 18 },
  encabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  titulo: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: { gap: 10, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colores.borde },
  nombre: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  subtitulo: { color: colores.textoSecundario, fontSize: 13, marginTop: -6 },
  boton: {
    height: 58,
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  error: { color: colores.acentoSuave, fontSize: 14, lineHeight: 19 },
});
