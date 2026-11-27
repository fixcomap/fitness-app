import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TipoAccion } from '../../lib/coach/acciones';
import type { EstadoAccion } from '../../lib/coach/chat';
import type { VistaTarjeta } from '../../lib/coach/tarjeta';
import { formatearNumero } from '../../lib/formato';
import { colores, radios } from '../../theme/tema';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

const ICONO: Record<TipoAccion, NombreIcono> = {
  crear_rutina: 'barbell-outline',
  agregar_ejercicios: 'add-circle-outline',
  quitar_ejercicios: 'remove-circle-outline',
  borrar_rutinas: 'trash-outline',
  registrar_comida: 'restaurant-outline',
  cargar_pasos: 'walk-outline',
};

const FINAL: Record<Exclude<EstadoAccion, 'pendiente'>, string> = {
  aplicada: 'Aplicado ✓',
  cancelada: 'Cancelado',
  caducada: 'Caducó: si todavía lo querés, pedíselo de nuevo.',
};

interface TarjetaAccionProps {
  tipo: TipoAccion;
  vista: VistaTarjeta;
  estado: EstadoAccion;
  aplicando: boolean;
  error: string | null; // lo que falló al aplicar
  pideConfirmar: boolean; // borrar: Aplicar pide un segundo paso
  onAplicar: () => void;
  onCancelar: () => void;
  onCambiarGramos: (indice: number, sentido: 1 | -1) => void;
}

// Una acción que propone el coach: qué hace, avisos, y Aplicar / Cancelar mientras está pendiente.
export function TarjetaAccion({
  tipo,
  vista,
  estado,
  aplicando,
  error,
  pideConfirmar,
  onAplicar,
  onCancelar,
  onCambiarGramos,
}: TarjetaAccionProps) {
  const [confirmando, setConfirmando] = useState(false);
  const pendiente = estado === 'pendiente';
  // "Ya no aplica" solo importa mientras se puede decidir.
  const problema = pendiente ? vista.problema : null;
  const puedeAplicar = pendiente && !problema && !aplicando;

  return (
    <View style={[styles.tarjeta, !pendiente && styles.decidida]}>
      <View style={styles.cabecera}>
        <Ionicons name={ICONO[tipo]} size={18} color={colores.texto} />
        <Text style={styles.titulo}>{vista.titulo}</Text>
      </View>

      <View style={styles.lineas}>
        {vista.lineas.map((linea, i) => (
          <View key={i} style={styles.linea}>
            <Text style={styles.textoLinea}>
              {linea.texto}
              {linea.aproximado && <Text style={styles.aproximado}>{'  '}aproximado</Text>}
            </Text>
            {pendiente && linea.gramosPorUnidad !== null && (
              <View style={styles.gramos}>
                <Text style={styles.etiquetaGramos}>Gramos por unidad</Text>
                <BotonChico icono="remove" etiqueta="Menos gramos" onPress={() => onCambiarGramos(i, -1)} />
                <Text style={styles.valorGramos}>{formatearNumero(linea.gramosPorUnidad)} g</Text>
                <BotonChico icono="add" etiqueta="Más gramos" onPress={() => onCambiarGramos(i, 1)} />
              </View>
            )}
          </View>
        ))}
      </View>

      {pendiente &&
        vista.avisos.map((aviso) => (
          <View key={aviso.tipo} style={styles.aviso}>
            <Ionicons name="warning-outline" size={15} color={colores.oro} />
            <Text style={styles.textoAviso}>{aviso.mensaje}</Text>
          </View>
        ))}

      {problema && (
        <View style={styles.aviso}>
          <Ionicons name="close-circle-outline" size={15} color={colores.acentoSuave} />
          <Text style={styles.textoProblema}>Ya no aplica: {problema.mensaje}</Text>
        </View>
      )}
      {error && pendiente && !problema && (
        <View style={styles.aviso}>
          <Ionicons name="close-circle-outline" size={15} color={colores.acentoSuave} />
          <Text style={styles.textoProblema}>{error}</Text>
        </View>
      )}

      {pendiente && confirmando && !problema ? (
        <View style={styles.confirmar}>
          <Text style={styles.textoConfirmar}>¿Seguro? Después vas a tener 6 segundos para deshacerlo.</Text>
          <View style={styles.botones}>
            <Pressable
              onPress={() => setConfirmando(false)}
              disabled={aplicando}
              style={({ pressed }) => [styles.boton, styles.botonCancelar, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Text style={styles.textoCancelar}>Volver</Text>
            </Pressable>
            <Pressable
              onPress={onAplicar}
              disabled={aplicando}
              style={({ pressed }) => [styles.boton, styles.botonAplicar, pressed && styles.presionado]}
              accessibilityRole="button"
              accessibilityState={{ busy: aplicando }}
            >
              {aplicando ? (
                <ActivityIndicator size="small" color={colores.texto} />
              ) : (
                <Text style={styles.textoAplicar}>Sí, borrar</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : pendiente ? (
        <View style={styles.botones}>
          <Pressable
            onPress={onCancelar}
            disabled={aplicando}
            style={({ pressed }) => [styles.boton, styles.botonCancelar, pressed && styles.presionado]}
            accessibilityRole="button"
          >
            <Text style={styles.textoCancelar}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={pideConfirmar ? () => setConfirmando(true) : onAplicar}
            disabled={!puedeAplicar}
            style={({ pressed }) => [styles.boton, styles.botonAplicar, !puedeAplicar && styles.deshabilitado, pressed && styles.presionado]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !puedeAplicar, busy: aplicando }}
          >
            {aplicando ? (
              <ActivityIndicator size="small" color={colores.texto} />
            ) : (
              <Text style={[styles.textoAplicar, !puedeAplicar && styles.textoDeshabilitado]}>Aplicar</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Text style={[styles.final, estado === 'aplicada' && styles.finalAplicada]}>{FINAL[estado]}</Text>
      )}
    </View>
  );
}

function BotonChico({ icono, etiqueta, onPress }: { icono: 'add' | 'remove'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.botonChico, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Ionicons name={icono} size={16} color={colores.texto} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 14,
    gap: 10,
  },
  decidida: { opacity: 0.75 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { flex: 1, color: colores.texto, fontSize: 16, fontWeight: '800' },
  lineas: { gap: 6 },
  linea: { gap: 6 },
  textoLinea: { color: '#D8D8D8', fontSize: 14, lineHeight: 20 },
  aproximado: { color: colores.oro, fontSize: 12, fontWeight: '700' },
  gramos: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  etiquetaGramos: { flex: 1, color: colores.textoSecundario, fontSize: 13 },
  valorGramos: { color: colores.texto, fontSize: 14, fontWeight: '800', minWidth: 52, textAlign: 'center' },
  botonChico: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  textoAviso: { flex: 1, color: colores.oro, fontSize: 13, lineHeight: 18 },
  textoProblema: { flex: 1, color: colores.acentoSuave, fontSize: 13, lineHeight: 18 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 2 },
  confirmar: { gap: 8 },
  textoConfirmar: { color: colores.texto, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  boton: { flex: 1, height: 42, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  botonCancelar: { backgroundColor: colores.tarjetaElevada },
  botonAplicar: { backgroundColor: colores.acento },
  deshabilitado: { backgroundColor: colores.pista },
  presionado: { opacity: 0.85 },
  textoCancelar: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  textoAplicar: { color: colores.texto, fontSize: 15, fontWeight: '800' },
  textoDeshabilitado: { color: colores.textoSecundario },
  final: { color: colores.textoSecundario, fontSize: 14, fontWeight: '700' },
  finalAplicada: { color: colores.verde },
});
