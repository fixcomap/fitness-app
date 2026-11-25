import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraDescanso } from '../components/entreno/BarraDescanso';
import { Miniatura } from '../components/entreno/Miniatura';
import { TablaSeries } from '../components/entreno/TablaSeries';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { useEntreno } from '../estado/Entreno';
import { useAhora } from '../hooks/useAhora';
import { textoProgresion, ultimaVez, usaPeso } from '../lib/entreno/progresion';
import { formatearCronometro } from '../lib/entreno/resumen';
import {
  agregarSerie,
  ajustarDescanso,
  borrarSerie,
  editarSerie,
  irAEjercicio,
  objetivoDe,
  progresoPorEjercicio,
  segundosRestantes,
  serieValida,
  terminarDescanso,
  tildarSerie,
  totalSeriesHechas,
} from '../lib/entreno/sesion';
import { colores, espacios, radios } from '../theme/tema';

interface SesionEnCursoScreenProps {
  onMinimizar: () => void;
  onTerminada: (id: string) => void;
  onDescartada: () => void;
}

export function SesionEnCursoScreen({ onMinimizar, onTerminada, onDescartada }: SesionEnCursoScreenProps) {
  // La pantalla no se apaga mientras se entrena.
  useKeepAwake();
  const { enCurso, historial, actualizar, terminar, descartar } = useEntreno();
  const ahora = useAhora(500);
  // Series que se quisieron tildar con datos que faltan: "ejercicio-serie".
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());

  const actual = enCurso?.actual ?? 0;
  const ejercicioActual = enCurso?.ejercicios[actual];
  const datos = ejercicioActual ? buscarEjercicioPorId(ejercicioActual.ejercicioId) : undefined;
  const ultima = useMemo(
    () => (ejercicioActual ? ultimaVez(historial, ejercicioActual.ejercicioId) : null),
    [historial, ejercicioActual],
  );

  if (!enCurso || !ejercicioActual) {
    return <SafeAreaView style={styles.pantalla} />;
  }

  const conPeso = datos ? usaPeso(datos.equipo) : true;
  const total = enCurso.ejercicios.length;
  const progreso = progresoPorEjercicio(enCurso);
  const aviso = datos ? textoProgresion(ultima, datos.equipo, ahora) : null;
  const restante = segundosRestantes(enCurso, ahora);
  const siguiente = actual + 1 < total ? enCurso.ejercicios[actual + 1] : null;
  const nombreSiguiente = siguiente ? (buscarEjercicioPorId(siguiente.ejercicioId)?.nombre ?? 'Ejercicio') : null;
  const marcadasActual = new Set(
    [...marcadas].filter((k) => k.startsWith(`${actual}-`)).map((k) => Number(k.split('-')[1])),
  );

  const tildar = (indice: number) => {
    const serie = ejercicioActual.series[indice];
    if (!serie.hecha && !serieValida(serie, conPeso)) {
      setMarcadas((m) => new Set(m).add(`${actual}-${indice}`));
      return;
    }
    actualizar((s) => tildarSerie(s, actual, indice, conPeso, new Date()));
  };

  const borrar = (indice: number) => {
    // Las marcas quedan atadas a la posición: al borrar una serie se limpian las de este ejercicio.
    setMarcadas((m) => new Set([...m].filter((k) => !k.startsWith(`${actual}-`))));
    actualizar((s) => borrarSerie(s, actual, indice));
  };

  const pedirTerminar = () => {
    if (totalSeriesHechas(enCurso) === 0) {
      Alert.alert('No tildaste ninguna serie', 'Si terminás ahora, la sesión no se guarda.', [
        { text: 'Seguir entrenando', style: 'cancel' },
        {
          text: 'Descartar sesión',
          style: 'destructive',
          onPress: () => {
            descartar();
            onDescartada();
          },
        },
      ]);
      return;
    }
    Alert.alert('¿Terminar la sesión?', 'Se guardan las series que tildaste.', [
      { text: 'Seguir entrenando', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: () => {
          const guardada = terminar();
          if (guardada) onTerminada(guardada.id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Arriba: nombre, cronómetro total, Terminar y progreso por ejercicio */}
        <View style={styles.cabecera}>
          <View style={styles.filaCabecera}>
            <Pressable onPress={onMinimizar} hitSlop={8} accessibilityRole="button" accessibilityLabel="Minimizar la sesión">
              <Ionicons name="chevron-down" size={26} color={colores.texto} />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.nombreSesion} numberOfLines={1}>
                {enCurso.nombre}
              </Text>
              <Text style={styles.cronometro} accessibilityLabel="Tiempo total">
                {formatearCronometro(ahora.getTime() - Date.parse(enCurso.inicio))}
              </Text>
            </View>
            <Pressable
              onPress={pedirTerminar}
              style={({ pressed }) => [styles.botonTerminar, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Text style={styles.textoTerminar}>Terminar</Text>
            </Pressable>
          </View>
          <View style={styles.progreso}>
            {progreso.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => actualizar((s) => irAEjercicio(s, i))}
                hitSlop={{ top: 10, bottom: 10 }}
                style={[styles.segmento, i === actual && styles.segmentoActual]}
                accessibilityRole="button"
                accessibilityLabel={`Ir al ejercicio ${i + 1}`}
              >
                <View style={[styles.rellenoSegmento, { width: `${Math.round(p * 100)}%` }]} />
              </Pressable>
            ))}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          {/* Ejercicio actual */}
          <View style={styles.ejercicio}>
            {datos && <Miniatura ejercicio={datos} tamano={64} />}
            <View style={styles.flex}>
              <Text style={styles.contador}>
                Ejercicio {actual + 1} de {total}
              </Text>
              <Text style={styles.nombreEjercicio}>{datos?.nombre ?? 'Ejercicio'}</Text>
            </View>
          </View>

          {aviso && (
            <View style={styles.aviso}>
              <Ionicons name="trending-up" size={18} color={colores.acentoSuave} />
              <Text style={styles.textoAviso}>{aviso}</Text>
            </View>
          )}

          <View style={styles.tarjeta}>
            <TablaSeries
              series={ejercicioActual.series}
              anteriores={ultima?.ejercicio.series ?? []}
              conPeso={conPeso}
              marcadas={marcadasActual}
              onEditar={(i, cambios) => actualizar((s) => editarSerie(s, actual, i, cambios))}
              onTildar={tildar}
              onBorrar={borrar}
              onAgregar={() => actualizar((s) => agregarSerie(s, actual))}
            />
          </View>
        </ScrollView>

        {/* Abajo: descanso y siguiente ejercicio */}
        <View style={styles.pie}>
          {enCurso.descanso && restante > 0 && (
            <BarraDescanso
              segundos={restante}
              onAjustar={(delta) => actualizar((s) => ajustarDescanso(s, delta, new Date()))}
              onSaltar={() => actualizar(terminarDescanso)}
            />
          )}
          {siguiente ? (
            <Pressable
              onPress={() => actualizar((s) => irAEjercicio(s, actual + 1))}
              style={({ pressed }) => [styles.botonSiguiente, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Text style={styles.textoSiguiente} numberOfLines={1}>
                Siguiente: {nombreSiguiente} · {objetivoDe(siguiente)}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colores.texto} />
            </Pressable>
          ) : (
            <Pressable
              onPress={pedirTerminar}
              style={({ pressed }) => [styles.botonSiguiente, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Text style={styles.textoSiguiente}>Terminar sesión</Text>
              <Ionicons name="flag" size={18} color={colores.texto} />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.8 },

  cabecera: { paddingHorizontal: espacios.m, paddingTop: espacios.s, paddingBottom: espacios.m, gap: espacios.m },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacios.s + 4 },
  nombreSesion: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  cronometro: { color: colores.acento, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  botonTerminar: {
    paddingHorizontal: espacios.m,
    height: 36,
    borderRadius: radios.pill,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.tarjeta,
    justifyContent: 'center',
  },
  textoTerminar: { color: colores.texto, fontSize: 14, fontWeight: '800' },
  progreso: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colores.pista, overflow: 'hidden' },
  segmentoActual: { borderWidth: 1, borderColor: colores.texto },
  rellenoSegmento: { height: '100%', backgroundColor: colores.acento },

  contenido: { paddingHorizontal: espacios.m, paddingBottom: espacios.l, gap: espacios.m },
  ejercicio: { flexDirection: 'row', alignItems: 'center', gap: espacios.m },
  contador: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  nombreEjercicio: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  aviso: {
    flexDirection: 'row',
    gap: espacios.s,
    alignItems: 'flex-start',
    backgroundColor: colores.tarjeta,
    borderRadius: radios.medio,
    borderLeftWidth: 3,
    borderLeftColor: colores.acento,
    padding: espacios.s + 4,
  },
  textoAviso: { flex: 1, color: colores.texto, fontSize: 14, lineHeight: 20 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.s + 4 },

  pie: {
    paddingHorizontal: espacios.m,
    paddingTop: espacios.s + 4,
    paddingBottom: espacios.s,
    gap: espacios.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  botonSiguiente: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacios.s,
    backgroundColor: colores.acento,
    borderRadius: radios.medio,
    paddingVertical: 14,
    paddingHorizontal: espacios.m,
  },
  textoSiguiente: { flexShrink: 1, color: colores.texto, fontSize: 15, fontWeight: '800' },
});
