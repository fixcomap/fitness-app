import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EncabezadoSesion } from '../components/entreno/EncabezadoSesion';
import { Miniatura } from '../components/entreno/Miniatura';
import { NOMBRE_EQUIPO, NOMBRE_MUSCULO } from '../data/nombres';
import { useEntreno } from '../estado/Entreno';
import { nombreSesion } from '../lib/entreno/sesion';
import { colores, espacios, radios } from '../theme/tema';

interface SesionArmadaScreenProps {
  onEmpezar: () => void;
  onAgregarEjercicios: () => void;
  onCerrar: () => void;
}

// Los ejercicios de la sesión de hoy: se reordenan, se sacan y se empieza.
export function SesionArmadaScreen({ onEmpezar, onAgregarEjercicios, onCerrar }: SesionArmadaScreenProps) {
  const insets = useSafeAreaInsets();
  const { ejerciciosArmados, enCurso, quitar, mover, empezar } = useEntreno();
  const vacia = ejerciciosArmados.length === 0;

  const alEmpezar = () => {
    if (enCurso || empezar()) onEmpezar();
  };

  return (
    <View style={styles.pantalla}>
      <EncabezadoSesion titulo="Sesión de hoy" icono="close" etiquetaBoton="Cerrar" onPress={onCerrar} />
      <ScrollView contentContainerStyle={styles.contenido}>
        {!vacia && (
          <View>
            <Text style={styles.nombre}>{nombreSesion(ejerciciosArmados)}</Text>
            <Text style={styles.secundario}>
              {ejerciciosArmados.length} {ejerciciosArmados.length === 1 ? 'ejercicio' : 'ejercicios'}
            </Text>
          </View>
        )}

        {vacia && (
          <View style={styles.vacio}>
            <Ionicons name="barbell-outline" size={40} color={colores.textoSecundario} />
            <Text style={styles.textoVacio}>Todavía no agregaste ejercicios.</Text>
            <Text style={styles.secundario}>Abrí un ejercicio en Entreno y tocá “Agregar a la sesión”.</Text>
          </View>
        )}

        {ejerciciosArmados.map((e, i) => (
          <View key={e.id} style={styles.fila}>
            <Text style={styles.numero}>{i + 1}</Text>
            <Miniatura ejercicio={e} />
            <View style={styles.flex}>
              <Text style={styles.nombreEjercicio} numberOfLines={2}>
                {e.nombre}
              </Text>
              <Text style={styles.secundario}>
                {NOMBRE_EQUIPO[e.equipo]} · {NOMBRE_MUSCULO[e.musculoPrincipal]}
              </Text>
            </View>
            <View style={styles.acciones}>
              <BotonIcono icono="chevron-up" etiqueta={`Subir ${e.nombre}`} deshabilitado={i === 0} onPress={() => mover(i, -1)} />
              <BotonIcono
                icono="chevron-down"
                etiqueta={`Bajar ${e.nombre}`}
                deshabilitado={i === ejerciciosArmados.length - 1}
                onPress={() => mover(i, 1)}
              />
              <BotonIcono icono="close" etiqueta={`Sacar ${e.nombre}`} onPress={() => quitar(e.id)} />
            </View>
          </View>
        ))}

        <Pressable onPress={onAgregarEjercicios} style={styles.agregar} accessibilityRole="button">
          <Ionicons name="add" size={18} color={colores.acento} />
          <Text style={styles.textoAgregar}>Agregar ejercicios</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, espacios.m) }]}>
        {enCurso && <Text style={styles.aviso}>Ya tenés una sesión en curso.</Text>}
        <Pressable
          onPress={alEmpezar}
          disabled={vacia && !enCurso}
          style={({ pressed }) => [styles.boton, vacia && !enCurso && styles.deshabilitado, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Ionicons name="play" size={16} color={colores.texto} />
          <Text style={styles.textoBoton}>{enCurso ? 'Volver a la sesión' : 'Empezar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BotonIcono({
  icono,
  etiqueta,
  onPress,
  deshabilitado = false,
}: {
  icono: 'chevron-up' | 'chevron-down' | 'close';
  etiqueta: string;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={4}
      style={({ pressed }) => [styles.botonIcono, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
    >
      <Ionicons name={icono} size={18} color={deshabilitado ? colores.pista : colores.texto} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.m, paddingBottom: 120, gap: espacios.s + 4 },
  flex: { flex: 1 },
  nombre: { color: colores.texto, fontSize: 26, fontWeight: '800' },
  secundario: { color: colores.textoSecundario, fontSize: 13 },
  vacio: { alignItems: 'center', gap: espacios.s, paddingVertical: espacios.xl, paddingHorizontal: espacios.l },
  textoVacio: { color: colores.texto, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s + 4,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.medio,
    padding: espacios.s + 4,
  },
  numero: { color: colores.acento, fontSize: 16, fontWeight: '800', width: 18, textAlign: 'center' },
  nombreEjercicio: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  acciones: { flexDirection: 'row', gap: 2 },
  botonIcono: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  agregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: espacios.m },
  textoAgregar: { color: colores.acento, fontSize: 15, fontWeight: '700' },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: espacios.m,
    gap: espacios.s,
    backgroundColor: colores.fondo,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  aviso: { color: colores.textoSecundario, fontSize: 13, textAlign: 'center' },
  boton: {
    flexDirection: 'row',
    gap: espacios.s,
    backgroundColor: colores.acento,
    borderRadius: radios.medio,
    paddingVertical: espacios.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deshabilitado: { opacity: 0.4 },
  presionado: { opacity: 0.85 },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
});
