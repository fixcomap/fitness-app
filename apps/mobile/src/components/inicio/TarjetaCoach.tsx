import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colores } from '../../theme/tema';

interface TarjetaCoachProps {
  esPremium: boolean;
  consejo: string;
  onResponder?: () => void;
  onProbarGratis?: () => void;
}

export function TarjetaCoach({ esPremium, consejo, onResponder, onProbarGratis }: TarjetaCoachProps) {
  if (esPremium) {
    return (
      <View style={[styles.tarjeta, styles.premium]}>
        <View style={[styles.avatar, styles.avatarIa]}>
          <Text style={styles.textoIa}>IA</Text>
        </View>
        <View style={styles.cuerpo}>
          <View style={styles.cabecera}>
            <Text style={[styles.titulo, styles.tituloPremium]}>Tu coach</Text>
            <Pressable onPress={onResponder} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.responder}>Responder ›</Text>
            </Pressable>
          </View>
          <Text style={styles.consejo}>{consejo}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tarjeta}>
      <View style={[styles.avatar, styles.avatarCandado]}>
        <Ionicons name="lock-closed-outline" size={16} color={colores.oro} />
      </View>
      <View style={styles.cuerpo}>
        <Text style={styles.titulo}>Tu coach</Text>
        {/* Texto borroso: se ve que hay un consejo, pero no se puede leer. */}
        <Text style={[styles.consejo, styles.borroso]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {consejo}
        </Text>
      </View>
      <View style={styles.capaBoton} pointerEvents="box-none">
        <Pressable
          onPress={onProbarGratis}
          style={({ pressed }) => [styles.botonOro, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoBotonOro}>Probar 7 días gratis</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colores.tarjeta,
    borderRadius: 24,
    padding: 16,
    minHeight: 86,
  },
  premium: { backgroundColor: colores.oroFondo, borderWidth: 1, borderColor: colores.oroBorde },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarIa: { backgroundColor: colores.oro },
  avatarCandado: { backgroundColor: colores.tarjetaElevada },
  textoIa: { color: colores.textoSobreAcento, fontWeight: '800', fontSize: 13 },
  cuerpo: { flex: 1, gap: 4 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  tituloPremium: { color: colores.oro },
  responder: { color: '#D8D8D8', fontSize: 13, fontWeight: '700' },
  consejo: { color: colores.texto, fontSize: 15, lineHeight: 21 },
  borroso: {
    color: 'transparent',
    textShadowColor: 'rgba(255,255,255,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // El botón queda encima del texto borroso, a la derecha y un poco abajo del centro.
  capaBoton: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 14,
    paddingTop: 22,
  },
  botonOro: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colores.oro,
    justifyContent: 'center',
  },
  presionado: { opacity: 0.85 },
  textoBotonOro: { color: colores.textoSobreAcento, fontSize: 14, fontWeight: '800' },
});
