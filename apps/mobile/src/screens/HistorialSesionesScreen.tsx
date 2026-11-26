import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EncabezadoSesion } from '../components/entreno/EncabezadoSesion';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { useEntreno } from '../estado/Entreno';
import { textoSeries } from '../lib/entreno/progresion';
import { duracionMs, formatearDuracion, seriesTotales, volumenTotal } from '../lib/entreno/resumen';
import type { SesionGuardada } from '../lib/entreno/tipos';
import { formatearFechaCorta, formatearNumero } from '../lib/formato';
import { colores, espacios, radios } from '../theme/tema';

// Sesiones pasadas, de la más nueva a la más vieja. Por ahora sólo historial:
// las rutinas guardadas llegan más adelante.
export function HistorialSesionesScreen({ onVolver }: { onVolver: () => void }) {
  const insets = useSafeAreaInsets();
  const { historial } = useEntreno();
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <View style={styles.pantalla}>
      <EncabezadoSesion titulo="Historial" icono="chevron-back" etiquetaBoton="Volver a Mis rutinas" onPress={onVolver} />
      <FlatList
        data={historial}
        keyExtractor={(s) => s.id}
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + espacios.m }]}
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Ionicons name="calendar-outline" size={40} color={colores.textoSecundario} />
            <Text style={styles.textoVacio}>Todavía no terminaste ninguna sesión.</Text>
            <Text style={styles.secundario}>Cuando termines una, la vas a ver acá.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TarjetaSesion
            sesion={item}
            abierta={abierta === item.id}
            onPress={() => setAbierta((a) => (a === item.id ? null : item.id))}
          />
        )}
      />
    </View>
  );
}

function TarjetaSesion({ sesion, abierta, onPress }: { sesion: SesionGuardada; abierta: boolean; onPress: () => void }) {
  const volumen = volumenTotal(sesion);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tarjeta, pressed && styles.presionada]}
      accessibilityRole="button"
      accessibilityState={{ expanded: abierta }}
    >
      <View style={styles.fila}>
        <View style={styles.flex}>
          <Text style={styles.fecha}>{formatearFechaCorta(new Date(sesion.fin))}</Text>
          <Text style={styles.nombre}>{sesion.nombre}</Text>
        </View>
        <Ionicons name={abierta ? 'chevron-up' : 'chevron-down'} size={20} color={colores.textoSecundario} />
      </View>
      <Text style={styles.secundario}>
        {formatearDuracion(duracionMs(sesion))} · {sesion.ejercicios.length}{' '}
        {sesion.ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'} · {seriesTotales(sesion)} series
        {volumen > 0 ? ` · ${formatearNumero(volumen)} kg` : ''}
      </Text>

      {abierta &&
        sesion.ejercicios.map((e) => (
          <View key={e.ejercicioId} style={styles.ejercicio}>
            <Text style={styles.nombreEjercicio}>{buscarEjercicioPorId(e.ejercicioId)?.nombre ?? 'Ejercicio'}</Text>
            <Text style={styles.secundario}>{textoSeries(e.series)}</Text>
          </View>
        ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.m, gap: espacios.s + 4 },
  flex: { flex: 1 },
  vacio: { alignItems: 'center', gap: espacios.s, paddingVertical: espacios.xl, paddingHorizontal: espacios.l },
  textoVacio: { color: colores.texto, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.m, gap: espacios.s },
  presionada: { backgroundColor: colores.tarjetaElevada },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacios.s },
  fecha: { color: colores.textoSecundario, fontSize: 12, fontWeight: '700' },
  nombre: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  secundario: { color: colores.textoSecundario, fontSize: 13 },
  ejercicio: {
    gap: 2,
    paddingTop: espacios.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  nombreEjercicio: { color: colores.texto, fontSize: 15, fontWeight: '600' },
});
