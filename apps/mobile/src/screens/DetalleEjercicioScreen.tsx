import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import {
  TarjetaErrores,
  TarjetaMusculos,
  TarjetaSeccion,
  TarjetaTecnica,
  TarjetaVideo,
} from '../components/detalle/SeccionesEjercicio';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { NOMBRE_EQUIPO, NOMBRE_NIVEL } from '../data/nombres';
import { useEntreno } from '../estado/Entreno';
import { ultimasSesionesDe } from '../lib/entreno/historial';
import { formatearKg, textoSeries } from '../lib/entreno/progresion';
import { mejorPeso } from '../lib/entreno/resumen';
import { formatearFechaCorta } from '../lib/formato';
import { colores, espacios, radios } from '../theme/tema';

const CANTIDAD_ULTIMAS = 3;

export function DetalleEjercicioScreen({ id }: { id: string }) {
  const ejercicio = buscarEjercicioPorId(id);
  const { armada, historial, agregar, quitar } = useEntreno();
  const ultimas = useMemo(() => ultimasSesionesDe(historial, id, CANTIDAD_ULTIMAS), [historial, id]);
  const mejor = useMemo(() => mejorPeso(historial, id), [historial, id]);
  const enLaSesion = armada.ejercicios.includes(id);

  if (!ejercicio) {
    return (
      <View style={[styles.pantalla, styles.centrado]}>
        <Text style={styles.textoSecundario}>No encontramos este ejercicio.</Text>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.bloque}>
          <Text style={styles.nombre}>{ejercicio.nombre}</Text>
          <View style={styles.fila}>
            <Chip texto={NOMBRE_EQUIPO[ejercicio.equipo]} />
            <Chip texto={NOMBRE_NIVEL[ejercicio.nivel]} />
          </View>
        </View>

        <TarjetaMusculos ejercicio={ejercicio} />

        {ultimas.length > 0 && (
          <TarjetaSeccion
            titulo="Tus últimas sesiones"
            extra={mejor !== null && <Text style={styles.mejor}>Mejor: {formatearKg(mejor)} kg</Text>}
          >
            {ultimas.map((u) => (
              <View key={u.sesionId} style={styles.sesionPasada}>
                <Text style={styles.fechaSesion}>{formatearFechaCorta(u.fecha)}</Text>
                <Text style={styles.textoSecundario}>{textoSeries(u.series)}</Text>
              </View>
            ))}
          </TarjetaSeccion>
        )}

        <TarjetaTecnica ejercicio={ejercicio} />
        <TarjetaErrores ejercicio={ejercicio} />
        <TarjetaVideo ejercicio={ejercicio} />
      </ScrollView>

      <View style={styles.pie}>
        {enLaSesion ? (
          <Pressable
            style={({ pressed }) => [styles.boton, styles.botonAgregado, pressed && styles.botonPresionado]}
            accessibilityRole="button"
            accessibilityHint="Lo saca de la sesión de hoy"
            onPress={() => quitar(ejercicio.id)}
          >
            <Ionicons name="checkmark-circle" size={20} color={colores.verde} />
            <Text style={styles.textoBoton}>En la sesión · Quitar</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
            accessibilityRole="button"
            onPress={() => agregar(ejercicio.id)}
          >
            <Ionicons name="add" size={20} color={colores.texto} />
            <Text style={styles.textoBoton}>Agregar a la sesión</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: espacios.m, paddingBottom: 110, gap: espacios.m },
  bloque: { gap: espacios.s + 4 },
  nombre: { color: colores.texto, fontSize: 30, fontWeight: '800' },
  fila: { flexDirection: 'row', gap: espacios.s },
  textoSecundario: { color: colores.textoSecundario, fontSize: 14 },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: espacios.m,
    backgroundColor: colores.fondo,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  mejor: { color: colores.oro, fontSize: 14, fontWeight: '800' },
  sesionPasada: { gap: 2 },
  fechaSesion: { color: colores.texto, fontSize: 14, fontWeight: '700' },
  boton: {
    flexDirection: 'row',
    gap: espacios.s,
    backgroundColor: colores.acento,
    borderRadius: radios.medio,
    paddingVertical: espacios.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonAgregado: { backgroundColor: colores.tarjetaElevada },
  botonPresionado: { opacity: 0.85 },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
});
