import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Ejercicio } from '../../data/tipos';
import { colores, espacios } from '../../theme/tema';
import { TarjetaErrores, TarjetaMusculos, TarjetaTecnica, TarjetaVideo } from '../detalle/SeccionesEjercicio';
import { coloresSesion as c, medidasSesion as m } from './estiloSesion';

interface HojaTecnicaProps {
  ejercicio: Ejercicio;
  onCerrar: () => void;
}

// Espacio que queda arriba de la hoja, para que se vea que es una hoja y no otra pantalla.
const ESPACIO_ARRIBA = 12;
// Cuánto hay que bajarla (fracción del alto) o qué tan rápido, para que se cierre.
const UMBRAL_CIERRE = 0.25;
const VELOCIDAD_CIERRE = 1.2;

// Hoja desde abajo, casi a pantalla completa, con la info del ejercicio (la misma
// del detalle). Se cierra deslizándola hacia abajo, con la ✕ o tocando afuera.
// Es un Modal encima de la sesión: la sesión y el descanso siguen corriendo.
export function HojaTecnica({ ejercicio, onCerrar }: HojaTecnicaProps) {
  const insets = useSafeAreaInsets();
  const { height: altoVentana } = useWindowDimensions();
  const alto = altoVentana - insets.top - ESPACIO_ARRIBA;
  // Arranca abajo (fuera de la pantalla) y sube al abrir.
  const [desplazamiento] = useState(() => new Animated.Value(alto));
  const scrollArriba = useRef(true);

  useEffect(() => {
    Animated.spring(desplazamiento, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 16 }).start();
  }, [desplazamiento]);

  const cerrar = useMemo(
    () => () =>
      Animated.timing(desplazamiento, { toValue: alto, duration: 220, useNativeDriver: true }).start(() => onCerrar()),
    [desplazamiento, alto, onCerrar],
  );

  // Arrastre hacia abajo: desde el encabezado siempre; desde el contenido, sólo si
  // ya está arriba del todo (si no, el gesto es para hacer scroll).
  const { desdeEncabezado, desdeContenido } = useMemo(() => {
    const haciaAbajo = (g: { dx: number; dy: number }) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
    const volver = () => Animated.spring(desplazamiento, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    const comun = {
      onPanResponderMove: (_: unknown, g: { dy: number }) => desplazamiento.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_: unknown, g: { dy: number; vy: number }) => {
        if (g.dy > alto * UMBRAL_CIERRE || g.vy > VELOCIDAD_CIERRE) cerrar();
        else volver();
      },
      onPanResponderTerminate: volver,
    };
    return {
      desdeEncabezado: PanResponder.create({ ...comun, onMoveShouldSetPanResponder: (_, g) => haciaAbajo(g) }),
      desdeContenido: PanResponder.create({
        ...comun,
        onMoveShouldSetPanResponderCapture: (_, g) => scrollArriba.current && haciaAbajo(g),
      }),
    };
  }, [desplazamiento, alto, cerrar]);

  const alScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollArriba.current = e.nativeEvent.contentOffset.y <= 0;
  };

  const opacidadFondo = desplazamiento.interpolate({ inputRange: [0, alto], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={cerrar}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.fondo, { opacity: opacidadFondo }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cerrar} accessibilityLabel="Cerrar la técnica" />
      </Animated.View>

      <Animated.View
        style={[styles.hoja, { height: alto, transform: [{ translateY: desplazamiento }] }]}
        accessibilityViewIsModal
      >
        <View style={styles.encabezado} {...desdeEncabezado.panHandlers}>
          <View style={styles.manija} />
          <View style={styles.filaTitulo}>
            <Text style={styles.titulo} numberOfLines={2} accessibilityRole="header">
              {ejercicio.nombre}
            </Text>
            <Pressable
              onPress={cerrar}
              hitSlop={8}
              style={({ pressed }) => [styles.cerrar, pressed && styles.presionado]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color={colores.texto} />
            </Pressable>
          </View>
        </View>

        <View style={styles.flex} {...desdeContenido.panHandlers}>
          <ScrollView
            contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + espacios.l }]}
            onScroll={alScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <TarjetaMusculos ejercicio={ejercicio} />
            <TarjetaTecnica ejercicio={ejercicio} />
            <TarjetaErrores ejercicio={ejercicio} />
            <TarjetaVideo ejercicio={ejercicio} />
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fondo: { backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.fondo,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  encabezado: { paddingHorizontal: m.margen, paddingTop: 8, paddingBottom: 12, gap: 10 },
  manija: { alignSelf: 'center', width: 40, height: 5, borderRadius: 2.5, backgroundColor: c.pistaAnillo },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { flex: 1, color: c.blanco, fontSize: 22, fontWeight: '900', letterSpacing: -0.3 },
  cerrar: {
    width: m.botonRedondo,
    height: m.botonRedondo,
    borderRadius: m.botonRedondo / 2,
    backgroundColor: c.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.8 },
  contenido: { paddingHorizontal: m.margen, gap: espacios.m },
});
