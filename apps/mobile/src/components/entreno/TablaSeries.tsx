import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatearKg } from '../../lib/entreno/progresion';
import { leerKg, leerReps } from '../../lib/entreno/sesion';
import type { SerieEnCurso, SerieHecha } from '../../lib/entreno/tipos';
import { colores, espacios, radios } from '../../theme/tema';

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

// Serie | Anterior | KG | REPS | ✓. Sin columna KG en los ejercicios sin peso.
export function TablaSeries({ series, anteriores, conPeso, marcadas, onEditar, onTildar, onBorrar, onAgregar }: TablaSeriesProps) {
  return (
    <View style={styles.tabla}>
      <View style={styles.fila}>
        <Text style={[styles.cabecera, styles.colSerie]}>Serie</Text>
        <Text style={[styles.cabecera, styles.colAnterior]}>Anterior</Text>
        {conPeso && <Text style={[styles.cabecera, styles.colKg]}>KG</Text>}
        <Text style={[styles.cabecera, styles.colReps]}>REPS</Text>
        <Text style={[styles.cabecera, styles.colCheck]}>✓</Text>
        <View style={styles.colBorrar} />
      </View>

      {series.map((s, i) => {
        const anterior = anteriores[i];
        const marcada = marcadas.has(i);
        const kgMal = marcada && conPeso && leerKg(s.kg) === null;
        const repsMal = marcada && leerReps(s.reps) === null;
        return (
          <View key={i} style={[styles.fila, styles.filaSerie, s.hecha && styles.filaHecha]}>
            <Text style={[styles.numero, styles.colSerie]}>{i + 1}</Text>
            <Text style={[styles.anterior, styles.colAnterior]} numberOfLines={1}>
              {textoAnterior(anterior, conPeso)}
            </Text>
            {conPeso && (
              <TextInput
                value={s.kg}
                onChangeText={(kg) => onEditar(i, { kg })}
                keyboardType="decimal-pad"
                selectTextOnFocus
                placeholder="–"
                placeholderTextColor={colores.textoSecundario}
                style={[styles.input, styles.colKg, kgMal && styles.inputMal]}
                accessibilityLabel={`Kilos de la serie ${i + 1}`}
              />
            )}
            <TextInput
              value={s.reps}
              onChangeText={(reps) => onEditar(i, { reps })}
              keyboardType="number-pad"
              selectTextOnFocus
              placeholder={String(s.repsObjetivo)}
              placeholderTextColor={colores.textoSecundario}
              style={[styles.input, styles.colReps, repsMal && styles.inputMal]}
              accessibilityLabel={`Repeticiones de la serie ${i + 1}`}
            />
            <View style={styles.colCheck}>
              <Pressable
                onPress={() => onTildar(i)}
                hitSlop={6}
                style={[styles.check, s.hecha && styles.checkHecho]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: s.hecha }}
                accessibilityLabel={`Serie ${i + 1} hecha`}
              >
                <Ionicons name="checkmark" size={18} color={s.hecha ? colores.textoSobreAcento : colores.textoSecundario} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => onBorrar(i)}
              hitSlop={6}
              style={styles.colBorrar}
              accessibilityRole="button"
              accessibilityLabel={`Borrar serie ${i + 1}`}
            >
              <Ionicons name="trash-outline" size={16} color={colores.textoSecundario} />
            </Pressable>
          </View>
        );
      })}

      <Pressable onPress={onAgregar} style={({ pressed }) => [styles.agregar, pressed && styles.presionado]} accessibilityRole="button">
        <Ionicons name="add" size={18} color={colores.texto} />
        <Text style={styles.textoAgregar}>Agregar serie</Text>
      </Pressable>
    </View>
  );
}

function textoAnterior(anterior: SerieHecha | undefined, conPeso: boolean): string {
  if (!anterior) return '—';
  if (conPeso && anterior.kg !== null) return `${formatearKg(anterior.kg)} × ${anterior.reps}`;
  return `${anterior.reps} reps`;
}

const styles = StyleSheet.create({
  tabla: { gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacios.s },
  filaSerie: { borderRadius: radios.chico, paddingVertical: 6 },
  filaHecha: { backgroundColor: colores.verdeFondo },
  cabecera: { color: colores.textoSecundario, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  colSerie: { width: 36, textAlign: 'center' },
  colAnterior: { flex: 1, textAlign: 'center' },
  colKg: { width: 64 },
  colReps: { width: 56 },
  colCheck: { width: 36, alignItems: 'center' },
  colBorrar: { width: 24, alignItems: 'center' },
  numero: { color: colores.texto, fontSize: 15, fontWeight: '800' },
  anterior: { color: colores.textoSecundario, fontSize: 13 },
  input: {
    backgroundColor: colores.tarjetaElevada,
    color: colores.texto,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: radios.chico,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputMal: { borderColor: colores.acento },
  check: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkHecho: { backgroundColor: colores.verde },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: espacios.s,
    paddingVertical: 12,
    borderRadius: radios.chico,
    backgroundColor: colores.tarjetaElevada,
  },
  presionado: { opacity: 0.8 },
  textoAgregar: { color: colores.texto, fontSize: 15, fontWeight: '700' },
});
