import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { buscarEjercicioPorId } from '../data/ejercicios';
import { useEntreno } from '../estado/Entreno';
import { formatearKg } from '../lib/entreno/progresion';
import { duracionMs, formatearDuracion, recordsNuevos, seriesTotales, volumenTotal } from '../lib/entreno/resumen';
import { formatearNumero } from '../lib/formato';
import { colores, espacios, radios } from '../theme/tema';

interface ResumenSesionScreenProps {
  id: string;
  onListo: () => void;
}

export function ResumenSesionScreen({ id, onListo }: ResumenSesionScreenProps) {
  // Dentro de un modal a pantalla completa los márgenes se aplican a mano.
  const insets = useSafeAreaInsets();
  const { historial } = useEntreno();
  const sesion = historial.find((s) => s.id === id);
  const records = useMemo(() => (sesion ? recordsNuevos(sesion, historial) : []), [sesion, historial]);

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <Ionicons name="trophy" size={36} color={colores.oro} />
          <Text style={styles.titulo}>¡Sesión terminada!</Text>
          {sesion && <Text style={styles.subtitulo}>{sesion.nombre}</Text>}
        </View>

        {sesion ? (
          <>
            <View style={styles.grilla}>
              <Dato valor={formatearDuracion(duracionMs(sesion))} etiqueta="Duración" />
              <Dato valor={String(sesion.ejercicios.length)} etiqueta="Ejercicios" />
              <Dato valor={String(seriesTotales(sesion))} etiqueta="Series" />
              <Dato valor={`${formatearNumero(volumenTotal(sesion))} kg`} etiqueta="Volumen total" />
            </View>

            <View style={styles.tarjeta}>
              <View style={styles.fila}>
                <Ionicons name="flame" size={20} color={colores.acento} />
                <Text style={styles.kcal}>{formatearNumero(sesion.kcal)} kcal</Text>
                <Text style={styles.estimado}>estimado</Text>
              </View>
              <Text style={styles.nota}>Se suman a la actividad de hoy en Inicio.</Text>
            </View>

            {records.length > 0 && (
              <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>Récords nuevos</Text>
                {records.map((r) => (
                  <View key={r.ejercicioId} style={styles.fila}>
                    <Ionicons name="medal" size={18} color={colores.oro} />
                    <Text style={styles.nombreRecord} numberOfLines={1}>
                      {buscarEjercicioPorId(r.ejercicioId)?.nombre ?? 'Ejercicio'}
                    </Text>
                    <Text style={styles.valorRecord}>{formatearKg(r.kg)} kg</Text>
                    <Text style={styles.anterior}>antes {formatearKg(r.anterior)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.nota}>No encontramos la sesión guardada.</Text>
        )}
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, espacios.m) }]}>
        <Pressable onPress={onListo} style={({ pressed }) => [styles.boton, pressed && styles.presionado]} accessibilityRole="button">
          <Text style={styles.textoBoton}>Listo</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.valorDato}>{valor}</Text>
      <Text style={styles.etiquetaDato}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.m, gap: espacios.m },
  encabezado: { alignItems: 'center', gap: espacios.s, paddingVertical: espacios.l },
  titulo: { color: colores.texto, fontSize: 28, fontWeight: '800' },
  subtitulo: { color: colores.textoSecundario, fontSize: 16 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacios.s + 4 },
  dato: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.medio,
    padding: espacios.m,
    gap: 4,
  },
  valorDato: { color: colores.texto, fontSize: 24, fontWeight: '800' },
  etiquetaDato: { color: colores.textoSecundario, fontSize: 13 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.m, gap: espacios.s + 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacios.s },
  kcal: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  estimado: {
    color: colores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  nota: { color: colores.textoSecundario, fontSize: 13 },
  tituloSeccion: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  nombreRecord: { flex: 1, color: colores.texto, fontSize: 15, fontWeight: '600' },
  valorRecord: { color: colores.oro, fontSize: 15, fontWeight: '800' },
  anterior: { color: colores.textoSecundario, fontSize: 12 },
  pie: { padding: espacios.m },
  boton: { backgroundColor: colores.acento, borderRadius: radios.medio, paddingVertical: espacios.m, alignItems: 'center' },
  presionado: { opacity: 0.85 },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
});
