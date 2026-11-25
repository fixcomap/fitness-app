import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { avisoPara } from '../../lib/actividad/avisos';
import type { EstadoFuente } from '../../lib/actividad/consultas';
import { colores } from '../../theme/tema';

export function AvisoFuenteActividad({ estado, onPermitir }: { estado: EstadoFuente; onPermitir: () => void }) {
  const aviso = avisoPara(estado, Platform.OS);
  if (!aviso) return null;

  const alTocar = aviso.boton?.accion === 'ajustes' ? () => Linking.openSettings() : onPermitir;

  return (
    <View style={styles.tarjeta}>
      <Ionicons name={aviso.icono} size={22} color={colores.textoSecundario} style={styles.icono} />
      <View style={styles.cuerpo}>
        <Text style={styles.titulo}>{aviso.titulo}</Text>
        <Text style={styles.texto}>{aviso.texto}</Text>
        {aviso.boton && (
          <Pressable
            onPress={alTocar}
            style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
            accessibilityRole="button"
          >
            <Text style={styles.textoBoton}>{aviso.boton.texto}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colores.tarjeta,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  icono: { marginTop: 1 },
  cuerpo: { flex: 1, gap: 6 },
  titulo: { color: colores.texto, fontSize: 15, fontWeight: '800' },
  texto: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  boton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colores.texto,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  presionado: { opacity: 0.85 },
  textoBoton: { color: colores.textoSobreAcento, fontWeight: '800', fontSize: 14 },
});
