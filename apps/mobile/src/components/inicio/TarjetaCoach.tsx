import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Consejo, DestinoConsejo } from '../../lib/coach/consejo';
import { colores } from '../../theme/tema';

export const TEXTO_PENSANDO = 'Pensando tu consejo de hoy…';

// Para el lector de pantalla: a dónde lleva tocar el consejo.
const NOMBRE_DESTINO: Record<Exclude<DestinoConsejo, 'coach'>, string> = {
  entreno: 'Entreno',
  comida: 'Comida',
  actividad: 'Actividad',
};

interface TarjetaCoachProps {
  habilitado: boolean; // premium o desbloqueo de desarrollo (ver coachHabilitado)
  consejo: Consejo | null; // null mientras se piensa
  consejoBloqueado: string; // el de ejemplo, borroso, para quien no tiene premium
  onHablar: () => void;
  onIrA: (destino: DestinoConsejo) => void;
  onProbarGratis: () => void;
}

export function TarjetaCoach({
  habilitado,
  consejo,
  consejoBloqueado,
  onHablar,
  onIrA,
  onProbarGratis,
}: TarjetaCoachProps) {
  if (habilitado) {
    const destino = consejo && consejo.destino !== 'coach' ? consejo.destino : null;
    return (
      <View style={[styles.tarjeta, styles.premium]}>
        <View style={[styles.avatar, styles.avatarIa]}>
          <Text style={styles.textoIa}>IA</Text>
        </View>
        <View style={styles.cuerpo}>
          <Text style={[styles.titulo, styles.tituloPremium]}>Tu coach</Text>
          {consejo ? (
            <Pressable
              onPress={() => onIrA(consejo.destino)}
              disabled={!destino}
              accessibilityRole={destino ? 'button' : 'text'}
              accessibilityHint={destino ? `Abre ${NOMBRE_DESTINO[destino]}` : undefined}
            >
              <Text style={styles.consejo}>{consejo.texto}</Text>
            </Pressable>
          ) : (
            <Text style={[styles.consejo, styles.pensando]} accessibilityLiveRegion="polite">
              {TEXTO_PENSANDO}
            </Text>
          )}
          <Pressable
            onPress={onHablar}
            style={({ pressed }) => [styles.botonHablar, pressed && styles.presionado]}
            accessibilityRole="button"
          >
            <Text style={styles.textoHablar}>Hablar con el coach</Text>
          </Pressable>
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
        <ConsejoBorroso consejo={consejoBloqueado} />
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

// Se ve que hay un consejo, pero no se puede leer.
// En iOS, blur nativo sobre el texto. En Android el blur de expo-blur necesita
// Android 12+ y si no, deja el texto legible: ahí se simulan las líneas.
function ConsejoBorroso({ consejo }: { consejo: string }) {
  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.lineas} accessibilityLabel="Consejo bloqueado">
        <View style={[styles.linea, styles.lineaLarga]} />
        <View style={[styles.linea, styles.lineaCorta]} />
      </View>
    );
  }
  return (
    <View accessibilityLabel="Consejo bloqueado" accessible>
      <Text style={[styles.consejo, styles.consejoTenue]} importantForAccessibility="no-hide-descendants">
        {consejo}
      </Text>
      <BlurView intensity={30} tint="dark" style={styles.capaBlur} />
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
  titulo: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  tituloPremium: { color: colores.oro },
  consejo: { color: colores.texto, fontSize: 15, lineHeight: 21 },
  pensando: { color: colores.textoSecundario, fontStyle: 'italic' },
  botonHablar: {
    alignSelf: 'flex-start',
    marginTop: 10,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colores.oroBorde,
    justifyContent: 'center',
  },
  textoHablar: { color: colores.oro, fontSize: 14, fontWeight: '700' },
  consejoTenue: { color: '#BDBDBD' },
  capaBlur: { position: 'absolute', top: -4, right: -4, bottom: -4, left: -4 },
  lineas: { gap: 9, paddingTop: 6, paddingBottom: 4 },
  linea: { height: 10, borderRadius: 5, backgroundColor: colores.texto, opacity: 0.18 },
  lineaLarga: { width: '92%' },
  lineaCorta: { width: '58%' },
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
