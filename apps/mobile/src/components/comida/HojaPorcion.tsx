import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { esAproximado, subtituloAlimento, type Alimento, type Nutrientes } from '../../lib/comida/alimentos';
import { nutrientesCantidad, type Cantidad } from '../../lib/comida/porciones';
import { formatearNumero } from '../../lib/formato';
import { colores, radios } from '../../theme/tema';
import { ControlPorcion } from './ControlPorcion';
import { CorregirValores } from './CorregirValores';

interface HojaPorcionProps {
  // null = cerrada. La cantidad inicial viene con el alimento (al editar, la ya cargada).
  abierta: { alimento: Alimento; cantidad: Cantidad } | null;
  textoBoton: string; // "Agregar al almuerzo" o "Guardar cambios"
  onConfirmar: (alimento: Alimento, cantidad: Cantidad) => void;
  onBorrar?: () => void; // sólo al editar algo ya cargado
  // Sólo al editar un alimento aproximado ya cargado: corregir sus valores cada 100 g.
  onCorregirValores?: (valores: Nutrientes) => void;
  onCerrar: () => void;
}

// Hoja de porción: cuánto, y las kcal y macros de eso.
export function HojaPorcion({ abierta, textoBoton, onConfirmar, onBorrar, onCorregirValores, onCerrar }: HojaPorcionProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={abierta !== null} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
        <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.manija} />
          {abierta && (
            // key: al abrir otro alimento, el contenido arranca de cero.
            <Contenido
              key={abierta.alimento.id}
              alimento={abierta.alimento}
              inicial={abierta.cantidad}
              textoBoton={textoBoton}
              onConfirmar={onConfirmar}
              onBorrar={onBorrar}
              onCorregirValores={onCorregirValores}
              onCerrar={onCerrar}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Contenido({
  alimento,
  inicial,
  textoBoton,
  onConfirmar,
  onBorrar,
  onCorregirValores,
  onCerrar,
}: {
  alimento: Alimento;
  inicial: Cantidad;
  textoBoton: string;
  onConfirmar: (alimento: Alimento, cantidad: Cantidad) => void;
  onBorrar?: () => void;
  onCorregirValores?: (valores: Nutrientes) => void;
  onCerrar: () => void;
}) {
  const [cantidad, setCantidad] = useState(inicial);
  const [verFuente, setVerFuente] = useState(false);
  // Dentro de la misma hoja (otro modal encima no anda bien en iOS).
  const [corrigiendo, setCorrigiendo] = useState(false);
  const corregible = onCorregirValores && esAproximado(alimento);
  const kcal = nutrientesCantidad(alimento, cantidad).kcal;
  const estimada = cantidad.modo === 'unidades' && alimento.porciones[cantidad.porcion]?.estimada;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido}>
      <View style={styles.encabezado}>
        <View style={styles.flex}>
          <Text style={styles.titulo}>{alimento.nombre}</Text>
          <Text style={styles.subtitulo}>{subtituloAlimento(alimento)}</Text>
        </View>
        <Pressable
          onPress={onCerrar}
          hitSlop={8}
          style={styles.cerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={20} color={colores.texto} />
        </Pressable>
      </View>

      {corrigiendo && onCorregirValores ? (
        <CorregirValores
          inicial={alimento}
          onGuardar={(valores) => {
            onCorregirValores(valores);
            setCorrigiendo(false);
          }}
          onVolver={() => setCorrigiendo(false)}
        />
      ) : (
        <>
          <ControlPorcion alimento={alimento} cantidad={cantidad} onCambiar={setCantidad} />

          <Pressable onPress={() => setVerFuente((v) => !v)} accessibilityRole="button">
            <Text style={styles.fuente} numberOfLines={verFuente ? undefined : 1}>
              {estimada ? 'Porción estimada. ' : ''}Valores: {alimento.fuente}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onConfirmar(alimento, cantidad)}
            style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
            accessibilityRole="button"
          >
            <Text style={styles.textoBoton}>{textoBoton}</Text>
            <Text style={styles.textoBoton}>{formatearNumero(kcal)} kcal</Text>
          </Pressable>

          {corregible && (
            <Pressable onPress={() => setCorrigiendo(true)} style={styles.borrar} accessibilityRole="button">
              <Ionicons name="create-outline" size={18} color={colores.oro} />
              <Text style={[styles.textoBorrar, styles.textoCorregir]}>Corregir valores aproximados</Text>
            </Pressable>
          )}

          {onBorrar && (
            <Pressable onPress={onBorrar} style={styles.borrar} accessibilityRole="button">
              <Ionicons name="trash-outline" size={18} color={colores.acento} />
              <Text style={styles.textoBorrar}>Borrar del diario</Text>
            </Pressable>
          )}
        </>
      )}
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
  subtitulo: { color: colores.textoSecundario, fontSize: 14, marginTop: 4 },
  cerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuente: { color: colores.textoSecundario, fontSize: 12, lineHeight: 17 },
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
  borrar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  textoBorrar: { color: colores.acento, fontSize: 15, fontWeight: '700' },
  textoCorregir: { color: colores.oro },
});
