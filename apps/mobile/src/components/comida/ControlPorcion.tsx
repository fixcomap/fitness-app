import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Alimento } from '../../lib/comida/alimentos';
import {
  cambiarCantidad,
  cambiarModo,
  gramosDe,
  leerGramos,
  nutrientesCantidad,
  textoCantidad,
  type Cantidad,
} from '../../lib/comida/porciones';
import { formatearNumero } from '../../lib/formato';
import { colores, radios } from '../../theme/tema';

interface ControlPorcionProps {
  alimento: Alimento;
  cantidad: Cantidad;
  onCambiar: (cantidad: Cantidad) => void;
  compacto?: boolean; // en el escáner: sin selector Unidades/Gramos y con los macros en una línea
}

// Unidades o gramos, − y +, y las kcal y macros de esa cantidad.
export function ControlPorcion({ alimento, cantidad, onCambiar, compacto = false }: ControlPorcionProps) {
  const n = nutrientesCantidad(alimento, cantidad);
  const conUnidades = alimento.porciones.length > 0;
  const porcion = cantidad.modo === 'unidades' ? alimento.porciones[cantidad.porcion] : undefined;

  return (
    <View style={styles.contenedor}>
      {conUnidades && !compacto && (
        <View style={styles.selector} accessibilityRole="tablist">
          {(['unidades', 'gramos'] as const).map((modo) => {
            const activo = cantidad.modo === modo;
            return (
              <Pressable
                key={modo}
                onPress={() => onCambiar(cambiarModo(alimento, cantidad, modo))}
                style={[styles.opcion, activo && styles.opcionActiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activo }}
              >
                <Text style={[styles.textoOpcion, activo && styles.textoOpcionActiva]}>
                  {modo === 'unidades' ? 'Unidades' : 'Gramos'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.fila}>
        <BotonPaso icono="remove" etiqueta="Menos" onPress={() => onCambiar(cambiarCantidad(cantidad, -1))} />
        <View style={[styles.centro, compacto && styles.centroCompacto]}>
          {cantidad.modo === 'gramos' ? (
            <EntradaGramos gramos={cantidad.gramos} compacto={compacto} onCambiar={onCambiar} />
          ) : (
            <Text style={[styles.valor, compacto && styles.valorCompacto]} numberOfLines={1} adjustsFontSizeToFit>
              {textoCantidad(alimento, cantidad)}
            </Text>
          )}
          {porcion && (
            <Text style={styles.gramos}>
              {porcion.estimada ? '≈ ' : ''}
              {formatearNumero(gramosDe(alimento, cantidad))} g
            </Text>
          )}
        </View>
        <BotonPaso icono="add" etiqueta="Más" onPress={() => onCambiar(cambiarCantidad(cantidad, 1))} />
      </View>

      {compacto ? (
        <Text style={styles.lineaMacros}>
          <Text style={styles.negrita}>{formatearNumero(n.proteinas)} g</Text> prot.{'   '}
          <Text style={styles.negrita}>{formatearNumero(n.carbos)} g</Text> carbos{'   '}
          <Text style={styles.negrita}>{formatearNumero(n.grasas)} g</Text> grasas
        </Text>
      ) : (
        <View style={styles.nutrientes}>
          <View style={styles.kcal}>
            <Text style={styles.numeroKcal}>{formatearNumero(n.kcal)}</Text>
            <Text style={styles.etiqueta}>kcal</Text>
          </View>
          <Macro gramos={n.proteinas} nombre="Proteínas" />
          <Macro gramos={n.carbos} nombre="Carbos" />
          <Macro gramos={n.grasas} nombre="Grasas" />
        </View>
      )}
    </View>
  );
}

// Los gramos se pueden escribir: se aplican al confirmar o al salir del campo.
function EntradaGramos({
  gramos,
  compacto,
  onCambiar,
}: {
  gramos: number;
  compacto: boolean;
  onCambiar: (c: Cantidad) => void;
}) {
  const [texto, setTexto] = useState<string | null>(null); // null = no se está escribiendo
  const aplicar = () => {
    const leidos = texto === null ? null : leerGramos(texto);
    if (leidos !== null) onCambiar({ modo: 'gramos', gramos: leidos });
    setTexto(null);
  };
  return (
    <View style={styles.filaGramos}>
      <TextInput
        value={texto ?? String(gramos)}
        onFocus={() => setTexto(String(gramos))}
        onChangeText={setTexto}
        onBlur={aplicar}
        onSubmitEditing={aplicar}
        keyboardType="number-pad"
        selectTextOnFocus
        maxLength={5}
        style={[styles.valor, compacto && styles.valorCompacto, styles.entrada]}
        accessibilityLabel="Gramos"
      />
      <Text style={[styles.valor, compacto && styles.valorCompacto]}> g</Text>
    </View>
  );
}

function BotonPaso({ icono, etiqueta, onPress }: { icono: 'add' | 'remove'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.paso, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Ionicons name={icono} size={24} color={colores.texto} />
    </Pressable>
  );
}

function Macro({ gramos, nombre }: { gramos: number; nombre: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.numeroMacro}>{formatearNumero(gramos)} g</Text>
      <Text style={styles.etiqueta}>{nombre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 16 },
  presionado: { opacity: 0.7 },
  selector: { flexDirection: 'row', backgroundColor: colores.fondo, borderRadius: 14, padding: 4 },
  opcion: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  opcionActiva: { backgroundColor: colores.texto },
  textoOpcion: { color: colores.textoSecundario, fontSize: 15, fontWeight: '700' },
  textoOpcionActiva: { color: colores.textoSobreAcento },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  centro: { flex: 1, alignItems: 'center', gap: 2 },
  centroCompacto: { alignItems: 'flex-start' },
  valor: { color: colores.texto, fontSize: 30, fontWeight: '800' },
  valorCompacto: { fontSize: 22 },
  filaGramos: { flexDirection: 'row', alignItems: 'baseline' },
  entrada: { padding: 0, minWidth: 40, textAlign: 'right' },
  gramos: { color: colores.textoSecundario, fontSize: 14 },
  paso: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutrientes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colores.fondo,
    borderRadius: radios.medio,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
  },
  kcal: { flex: 1.3 },
  numeroKcal: { color: colores.acento, fontSize: 26, fontWeight: '800' },
  macro: { flex: 1 },
  numeroMacro: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  etiqueta: { color: colores.textoSecundario, fontSize: 13 },
  lineaMacros: { color: colores.textoSecundario, fontSize: 14 },
  negrita: { color: colores.texto, fontWeight: '800' },
});
