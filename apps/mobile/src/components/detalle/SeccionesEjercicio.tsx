// Secciones de la info de un ejercicio: las usan el detalle (Entreno) y la hoja
// de técnica de la sesión en curso.
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { NOMBRE_MUSCULO } from '../../data/nombres';
import type { Ejercicio } from '../../data/tipos';
import { colores, espacios, radios } from '../../theme/tema';
import { COLOR_PRINCIPAL, COLOR_SECUNDARIO, MapaMuscular } from '../MapaMuscular';
import { MediaEjercicio, medioDeEjercicio, ReportarVideo } from '../MediaEjercicio';

// Tarjeta con título, como las del detalle.
export function TarjetaSeccion({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.tarjeta}>
      <View style={styles.filaTitulo}>
        <Text style={styles.titulo}>{titulo}</Text>
        {extra}
      </View>
      {children}
    </View>
  );
}

export function TarjetaMusculos({ ejercicio }: { ejercicio: Ejercicio }) {
  const principales = useMemo(() => [ejercicio.musculoPrincipal], [ejercicio.musculoPrincipal]);
  const secundarios = ejercicio.musculosSecundarios;
  return (
    <TarjetaSeccion titulo="Músculos que trabajás">
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
    </TarjetaSeccion>
  );
}

export function TarjetaTecnica({ ejercicio }: { ejercicio: Ejercicio }) {
  return (
    <TarjetaSeccion titulo="Técnica">
      {ejercicio.tecnica.map((paso, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.numero}>{i + 1}</Text>
          <Text style={styles.textoItem}>{paso}</Text>
        </View>
      ))}
    </TarjetaSeccion>
  );
}

export function TarjetaErrores({ ejercicio }: { ejercicio: Ejercicio }) {
  return (
    <TarjetaSeccion titulo="Errores comunes">
      {ejercicio.erroresComunes.map((error, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.cruz} accessibilityLabel="Error">
            ✕
          </Text>
          <Text style={styles.textoItem}>{error}</Text>
        </View>
      ))}
    </TarjetaSeccion>
  );
}

export function TarjetaVideo({ ejercicio }: { ejercicio: Ejercicio }) {
  const medio = medioDeEjercicio(ejercicio);
  return (
    <TarjetaSeccion titulo="Mirá cómo se hace">
      <View style={styles.video}>
        <MediaEjercicio medio={medio} />
        {medio.tipo === 'youtube' && <ReportarVideo ejercicioId={ejercicio.id} youtubeId={medio.videoId} />}
      </View>
    </TarjetaSeccion>
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
  flex: { flex: 1 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.m + 4, gap: espacios.m },
  filaTitulo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: espacios.s },
  titulo: { color: colores.texto, fontSize: 20, fontWeight: '800' },
  leyenda: { gap: espacios.s + 4 },
  itemLeyenda: { flexDirection: 'row', alignItems: 'flex-start', gap: espacios.s + 4 },
  punto: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tituloLeyenda: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  textoSecundario: { color: colores.textoSecundario, fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: espacios.s + 4 },
  numero: { color: colores.acento, fontSize: 22, fontWeight: '800', width: 24, lineHeight: 24 },
  cruz: { color: colores.acento, fontSize: 18, fontWeight: '800', width: 24, lineHeight: 24 },
  textoItem: { flex: 1, color: colores.texto, fontSize: 15, lineHeight: 22 },
  video: { gap: espacios.s },
});
