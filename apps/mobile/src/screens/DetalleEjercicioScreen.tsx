import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../components/Chip';
import { COLOR_PRINCIPAL, COLOR_SECUNDARIO, MapaMuscular } from '../components/MapaMuscular';
import { MediaEjercicio, medioDeEjercicio, ReportarVideo } from '../components/MediaEjercicio';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { NOMBRE_EQUIPO, NOMBRE_MUSCULO, NOMBRE_NIVEL } from '../data/nombres';
import { colores, espacios, radios } from '../theme/tema';

export function DetalleEjercicioScreen({ id }: { id: string }) {
  const ejercicio = buscarEjercicioPorId(id);
  const principales = useMemo(() => (ejercicio ? [ejercicio.musculoPrincipal] : []), [ejercicio]);

  if (!ejercicio) {
    return (
      <View style={[styles.pantalla, styles.centrado]}>
        <Text style={styles.textoSecundario}>No encontramos este ejercicio.</Text>
      </View>
    );
  }

  const secundarios = ejercicio.musculosSecundarios;
  const medio = medioDeEjercicio(ejercicio);

  return (
    <View style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.video}>
          <MediaEjercicio medio={medio} />
          {medio.tipo === 'youtube' && <ReportarVideo ejercicioId={ejercicio.id} youtubeId={medio.videoId} />}
        </View>

        <View style={styles.bloque}>
          <Text style={styles.nombre}>{ejercicio.nombre}</Text>
          <View style={styles.fila}>
            <Chip texto={NOMBRE_EQUIPO[ejercicio.equipo]} />
            <Chip texto={NOMBRE_NIVEL[ejercicio.nivel]} />
          </View>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>Músculos que trabajás</Text>
          <MapaMuscular escala={0.75} musculosPrincipales={principales} musculosSecundarios={secundarios} />
          <View style={styles.leyenda}>
            <ItemLeyenda color={COLOR_PRINCIPAL} titulo="Principal" detalle={NOMBRE_MUSCULO[ejercicio.musculoPrincipal]} />
            {secundarios.length > 0 && (
              <ItemLeyenda
                color={COLOR_SECUNDARIO}
                titulo="Secundarios"
                detalle={secundarios.map((m) => NOMBRE_MUSCULO[m]).join(', ')}
              />
            )}
          </View>
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>Técnica</Text>
          {ejercicio.tecnica.map((paso, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.numero}>{i + 1}</Text>
              <Text style={styles.textoItem}>{paso}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>Errores comunes</Text>
          {ejercicio.erroresComunes.map((error, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.cruz} accessibilityLabel="Error">
                ✕
              </Text>
              <Text style={styles.textoItem}>{error}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.pie}>
        {/* Por ahora sin funcionalidad: la sesión de entreno llega más adelante. */}
        <Pressable
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          accessibilityRole="button"
          onPress={() => {}}
        >
          <Text style={styles.textoBoton}>Agregar a la sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ItemLeyenda({ color, titulo, detalle }: { color: string; titulo: string; detalle: string }) {
  return (
    <View style={styles.itemLeyenda}>
      <View style={[styles.punto, { backgroundColor: color }]} />
      <View style={styles.flex}>
        <Text style={styles.tituloLeyenda}>{titulo}</Text>
        <Text style={styles.textoSecundario}>{detalle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: espacios.m, paddingBottom: 110, gap: espacios.m },
  bloque: { gap: espacios.s + 4 },
  video: { gap: espacios.s },
  nombre: { color: colores.texto, fontSize: 30, fontWeight: '800' },
  fila: { flexDirection: 'row', gap: espacios.s },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.m + 4, gap: espacios.m },
  tituloSeccion: { color: colores.texto, fontSize: 20, fontWeight: '800' },
  leyenda: { gap: espacios.s + 4 },
  itemLeyenda: { flexDirection: 'row', alignItems: 'flex-start', gap: espacios.s + 4 },
  punto: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tituloLeyenda: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: espacios.s + 4 },
  numero: { color: colores.acento, fontSize: 22, fontWeight: '800', width: 24, lineHeight: 24 },
  cruz: { color: colores.acento, fontSize: 18, fontWeight: '800', width: 24, lineHeight: 24 },
  textoItem: { flex: 1, color: colores.texto, fontSize: 15, lineHeight: 22 },
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
  boton: { backgroundColor: colores.acento, borderRadius: radios.medio, paddingVertical: espacios.m, alignItems: 'center' },
  botonPresionado: { opacity: 0.85 },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
});
