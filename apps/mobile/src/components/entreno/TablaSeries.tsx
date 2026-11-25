import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatearKg } from '../../lib/entreno/progresion';
import { leerKg, leerReps } from '../../lib/entreno/sesion';
import type { SerieEnCurso, SerieHecha } from '../../lib/entreno/tipos';
import { coloresSesion as c, medidasSesion as m } from './estiloSesion';

interface TablaSeriesProps {
  series: SerieEnCurso[];
  anteriores: SerieHecha[]; // las de la última vez, en el mismo orden
  conPeso: boolean;
  marcadas: ReadonlySet<number>; // series que se quisieron tildar con datos inválidos
  onEditar: (indice: number, cambios: Partial<Pick<SerieEnCurso, 'kg' | 'reps'>>) => void;
  onTildar: (indice: number) => void;
  onBorrar: (indice: number) => void;
  onAgregar: () => void;
}

// SERIE | ANTERIOR | KG | REPS | ✓. Sin columna KG en los ejercicios sin peso.
// Para borrar una serie se mantiene apretado su número.
export function TablaSeries({ series, anteriores, conPeso, marcadas, onEditar, onTildar, onBorrar, onAgregar }: TablaSeriesProps) {
  const pedirBorrar = (indice: number) =>
    Alert.alert(`¿Borrar la serie ${indice + 1}?`, undefined, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => onBorrar(indice) },
    ]);

  return (
    <View style={styles.tabla}>
      <View style={[styles.fila, styles.filaCabecera]}>
        <Text style={[styles.cabecera, styles.colSerie]}>SERIE</Text>
        <Text style={[styles.cabecera, styles.colAnterior]}>ANTERIOR</Text>
        {conPeso && <Text style={[styles.cabecera, styles.colCasilla]}>KG</Text>}
        <Text style={[styles.cabecera, styles.colCasilla]}>REPS</Text>
        <View style={styles.colCheck} />
      </View>

      {series.map((s, i) => {
        const marcada = marcadas.has(i);
        const kgMal = marcada && conPeso && leerKg(s.kg) === null;
        const repsMal = marcada && leerReps(s.reps) === null;
        return (
          <View key={i} style={[styles.fila, styles.filaSerie, s.hecha && styles.filaHecha]}>
            <Pressable
              onLongPress={() => pedirBorrar(i)}
              delayLongPress={400}
              style={styles.datosSerie}
              accessibilityLabel={`Serie ${i + 1}`}
              accessibilityHint="Mantené apretado para borrarla"
              accessibilityActions={[{ name: 'borrar', label: 'Borrar serie' }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'borrar') pedirBorrar(i);
              }}
            >
              <Text style={[styles.numero, styles.colSerie]}>{i + 1}</Text>
              <Text style={[styles.anterior, styles.colAnterior]} numberOfLines={1}>
                {textoAnterior(anteriores[i], conPeso)}
              </Text>
            </Pressable>
            {conPeso && (
              <TextInput
                value={s.kg}
                onChangeText={(kg) => onEditar(i, { kg })}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="–"
                placeholderTextColor={c.textoTenue}
                style={[styles.casilla, kgMal && styles.casillaMal]}
                accessibilityLabel={`Kilos de la serie ${i + 1}`}
              />
            )}
            <TextInput
              value={s.reps}
              onChangeText={(reps) => onEditar(i, { reps })}
              keyboardType="number-pad"
              selectTextOnFocus
              placeholder={String(s.repsObjetivo)}
              placeholderTextColor={c.textoTenue}
              style={[styles.casilla, repsMal && styles.casillaMal]}
              accessibilityLabel={`Repeticiones de la serie ${i + 1}`}
            />
            <Pressable
              onPress={() => onTildar(i)}
              hitSlop={4}
              style={[styles.check, s.hecha ? styles.checkHecho : styles.checkPendiente]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.hecha }}
              accessibilityLabel={`Serie ${i + 1} hecha`}
            >
              <Ionicons name="checkmark" size={20} color={s.hecha ? c.blanco : c.checkApagado} />
            </Pressable>
          </View>
        );
      })}

      <Pressable
        onPress={onAgregar}
        style={({ pressed }) => [styles.agregar, pressed && styles.presionado]}
        accessibilityRole="button"
      >
        <Text style={styles.textoAgregar}>+ Agregar serie</Text>
      </Pressable>
    </View>
  );
}

function textoAnterior(anterior: SerieHecha | undefined, conPeso: boolean): string {
  if (!anterior) return '—';
  if (conPeso && anterior.kg !== null) return `${formatearKg(anterior.kg)} × ${anterior.reps}`;
  return `${anterior.reps} reps`;
}

const GAP = 8;

const styles = StyleSheet.create({
  tabla: { gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: GAP, paddingHorizontal: GAP },
  filaCabecera: { paddingBottom: 2 },
  filaSerie: { height: m.alturaFila, borderRadius: 14 },
  filaHecha: { backgroundColor: c.serieHecha },
  // Mismo espacio entre columnas que la cabecera, para que queden alineadas.
  datosSerie: { flex: 1, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: GAP },
  cabecera: { color: c.textoTenue, fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  colSerie: { width: 44 },
  colAnterior: { flex: 1 },
  colCasilla: { width: m.anchoCasilla, textAlign: 'center' },
  colCheck: { width: m.check },
  numero: { color: c.blanco, fontSize: 18, fontWeight: '800' },
  anterior: { color: c.textoTenue, fontSize: 14 },
  casilla: {
    width: m.anchoCasilla,
    height: m.altoCasilla,
    borderRadius: 11,
    backgroundColor: c.campo,
    color: c.blanco,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    padding: 0,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  casillaMal: { borderColor: c.rojo },
  check: { width: m.check, height: m.check, borderRadius: m.check / 2, alignItems: 'center', justifyContent: 'center' },
  checkHecho: { backgroundColor: c.rojo },
  checkPendiente: { borderWidth: 1.5, borderColor: c.pistaAnillo },
  agregar: {
    height: 46,
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: c.bordeDiscontinuo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.7 },
  textoAgregar: { color: c.textoBoton, fontSize: 15, fontWeight: '800' },
});
