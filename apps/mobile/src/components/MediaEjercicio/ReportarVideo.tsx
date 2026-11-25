import { Pressable, StyleSheet, Text } from 'react-native';

import { useVideoReportado } from '../../hooks/useVideoReportado';
import { colores } from '../../theme/tema';

// Link chico debajo del video para avisar que no muestra bien el ejercicio.
export function ReportarVideo({ ejercicioId, youtubeId }: { ejercicioId: string; youtubeId: string }) {
  const { reportado, reportar } = useVideoReportado(ejercicioId, youtubeId);

  if (reportado) {
    return (
      <Text style={styles.texto} accessibilityLiveRegion="polite">
        Gracias, lo vamos a revisar
      </Text>
    );
  }

  return (
    <Pressable onPress={reportar} hitSlop={10} style={styles.link} accessibilityRole="button">
      <Text style={[styles.texto, styles.subrayado]}>¿El video no sirve?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center' },
  texto: { alignSelf: 'center', color: colores.textoSecundario, fontSize: 13 },
  subrayado: { textDecorationLine: 'underline' },
});
