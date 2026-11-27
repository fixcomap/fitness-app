import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOMBRE_COMIDA, type Comida } from '../../lib/comida/diario';
import { colores, radios } from '../../theme/tema';

interface MenuAgregarProps {
  comida: Comida | null; // null = cerrado
  onBuscar: (comida: Comida) => void;
  onEscanear: (comida: Comida) => void;
  onFoto: (comida: Comida) => void;
  // Foto con IA: premium, con el mismo desbloqueo de desarrollo que el coach (useCoachHabilitado).
  fotoHabilitada: boolean;
  onDesbloquearDev: (() => void) | null; // solo en desarrollo
  onCerrar: () => void;
}

// El "+" de cada comida: buscar, escanear o foto con IA (premium).
export function MenuAgregar({
  comida,
  onBuscar,
  onEscanear,
  onFoto,
  fotoHabilitada,
  onDesbloquearDev,
  onCerrar,
}: MenuAgregarProps) {
  const insets = useSafeAreaInsets();
  const elegir = (accion: (c: Comida) => void) => () => {
    if (!comida) return;
    onCerrar();
    accion(comida);
  };
  return (
    <Modal visible={comida !== null} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.manija} />
        <Text style={styles.titulo}>Agregar {comida ? `a ${NOMBRE_COMIDA[comida].toLowerCase()}` : ''}</Text>
        <Opcion icono="search" titulo="Buscar" detalle="Comidas caseras y productos" onPress={elegir(onBuscar)} />
        <Opcion
          icono="barcode-outline"
          titulo="Escanear"
          detalle="Código de barras del envase"
          onPress={elegir(onEscanear)}
        />
        {fotoHabilitada ? (
          <Opcion
            icono="camera-outline"
            titulo="Foto con IA"
            detalle="Sacale una foto al plato"
            onPress={elegir(onFoto)}
          />
        ) : (
          <Opcion
            icono="camera-outline"
            titulo="Foto con IA"
            detalle={onDesbloquearDev ? 'Con Premium · tocá para desbloquear (solo desarrollo)' : 'Con Premium'}
            bloqueada
            onPress={onDesbloquearDev ?? undefined}
          />
        )}
      </View>
    </Modal>
  );
}

function Opcion({
  icono,
  titulo,
  detalle,
  bloqueada = false,
  onPress,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  detalle: string;
  bloqueada?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      // Bloqueada se puede tocar solo si hay algo que hacer (el desbloqueo de desarrollo).
      disabled={!onPress}
      style={({ pressed }) => [styles.opcion, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
    >
      <View style={[styles.icono, bloqueada && styles.iconoBloqueado]}>
        <Ionicons name={icono} size={22} color={bloqueada ? colores.textoSecundario : colores.texto} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.tituloOpcion, bloqueada && styles.textoBloqueado]}>{titulo}</Text>
        <Text style={styles.detalle}>{detalle}</Text>
      </View>
      {bloqueada ? (
        <View style={styles.premium}>
          <Ionicons name="lock-closed" size={11} color={colores.oro} />
          <Text style={styles.textoPremium}>PREMIUM</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  presionado: { opacity: 0.7 },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: {
    backgroundColor: colores.tarjeta,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    gap: 6,
  },
  manija: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#444', marginTop: 10 },
  titulo: { color: colores.texto, fontSize: 21, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoBloqueado: { backgroundColor: colores.tarjetaElevada },
  tituloOpcion: { color: colores.texto, fontSize: 17, fontWeight: '700' },
  textoBloqueado: { color: colores.textoSecundario },
  detalle: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radios.pill,
    backgroundColor: colores.oroFondo,
    borderWidth: 1,
    borderColor: colores.oroBorde,
  },
  textoPremium: { color: colores.oro, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
