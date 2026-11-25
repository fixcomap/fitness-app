import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarraDescanso } from '../components/entreno/BarraDescanso';
import { Cronometro } from '../components/entreno/Cronometro';
import { PaginaEjercicio } from '../components/entreno/PaginaEjercicio';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { useEntreno } from '../estado/Entreno';
import { usaPeso } from '../lib/entreno/progresion';
import {
  agregarSerie,
  ajustarDescanso,
  borrarSerie,
  editarSerie,
  irAEjercicio,
  objetivoDe,
  progresoPorEjercicio,
  serieValida,
  terminarDescanso,
  tildarSerie,
  totalSeriesHechas,
} from '../lib/entreno/sesion';
import type { EjercicioEnCurso } from '../lib/entreno/tipos';
import { colores, espacios, radios } from '../theme/tema';

// Alto aproximado de la barra de descanso, para que no tape el final de la página.
const ALTO_BARRA_DESCANSO = 90;

interface SesionEnCursoScreenProps {
  onMinimizar: () => void;
  onTerminada: (id: string) => void;
  onDescartada: () => void;
}

export function SesionEnCursoScreen({ onMinimizar, onTerminada, onDescartada }: SesionEnCursoScreenProps) {
  // La pantalla no se apaga mientras se entrena.
  useKeepAwake();
  // Dentro de un modal a pantalla completa SafeAreaView no siempre recibe los
  // márgenes: se aplican a mano.
  const insets = useSafeAreaInsets();
  const { width: ancho } = useWindowDimensions();
  const { enCurso, historial, actualizar, terminar, descartar } = useEntreno();
  // Series que se quisieron tildar con datos que faltan: "ejercicio-serie".
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const lista = useRef<FlatList<EjercicioEnCurso>>(null);
  const actual = enCurso?.actual ?? 0;

  // Si el ejercicio cambia por un botón o la barra de arriba, se desliza hasta él.
  useEffect(() => {
    lista.current?.scrollToIndex({ index: actual, animated: true });
  }, [actual]);

  if (!enCurso) {
    return <View style={styles.pantalla} />;
  }

  const total = enCurso.ejercicios.length;
  const progreso = progresoPorEjercicio(enCurso);

  const irA = (indice: number) => actualizar((s) => irAEjercicio(s, indice));

  // Al terminar de deslizar, el ejercicio visible pasa a ser el actual.
  const alDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const indice = Math.round(e.nativeEvent.contentOffset.x / ancho);
    if (indice !== actual) irA(indice);
  };

  const tildar = (indiceEjercicio: number, indiceSerie: number) => {
    const ejercicio = enCurso.ejercicios[indiceEjercicio];
    const datos = buscarEjercicioPorId(ejercicio.ejercicioId);
    const conPeso = datos ? usaPeso(datos.equipo) : true;
    const serie = ejercicio.series[indiceSerie];
    if (!serie.hecha && !serieValida(serie, conPeso)) {
      setMarcadas((m) => new Set(m).add(`${indiceEjercicio}-${indiceSerie}`));
      return;
    }
    actualizar((s) => tildarSerie(s, indiceEjercicio, indiceSerie, conPeso, new Date()));
  };

  const borrar = (indiceEjercicio: number, indiceSerie: number) => {
    // Las marcas quedan atadas a la posición: al borrar una serie se limpian las de ese ejercicio.
    setMarcadas((m) => new Set([...m].filter((k) => !k.startsWith(`${indiceEjercicio}-`))));
    actualizar((s) => borrarSerie(s, indiceEjercicio, indiceSerie));
  };

  const marcadasDe = (indice: number) =>
    new Set([...marcadas].filter((k) => k.startsWith(`${indice}-`)).map((k) => Number(k.split('-')[1])));

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

  const espacioAbajo = enCurso.descanso ? ALTO_BARRA_DESCANSO : 0;

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Arriba: nombre, cronómetro total, Terminar y progreso por ejercicio */}
        <View style={styles.cabecera}>
          <View style={styles.filaCabecera}>
            <Pressable
              onPress={onMinimizar}
              hitSlop={8}
              style={styles.botonRedondo}
              accessibilityRole="button"
              accessibilityLabel="Minimizar la sesión"
            >
              <Ionicons name="chevron-down" size={24} color={colores.texto} />
            </Pressable>
            <View style={styles.flex}>
              <Text style={styles.nombreSesion} numberOfLines={1}>
                {enCurso.nombre}
              </Text>
              <Cronometro inicio={enCurso.inicio} style={styles.cronometro} />
            </View>
            <Pressable
              onPress={pedirTerminar}
              style={({ pressed }) => [styles.botonTerminar, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Text style={styles.textoTerminar}>Terminar</Text>
            </Pressable>
          </View>
          {/* Cada segmento tiene un área de toque alta, aunque la línea sea fina. */}
          <View style={styles.progreso}>
            {progreso.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => irA(i)}
                style={styles.toqueSegmento}
                accessibilityRole="button"
                accessibilityLabel={`Ir al ejercicio ${i + 1}`}
                accessibilityState={{ selected: i === actual }}
              >
                <View style={[styles.segmento, i === actual && styles.segmentoActual]}>
                  <View style={[styles.rellenoSegmento, { width: `${Math.round(p * 100)}%` }]} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Un ejercicio por página: se desliza hacia los costados */}
        <FlatList
          ref={lista}
          data={enCurso.ejercicios}
          extraData={[marcadas, historial, espacioAbajo]}
          keyExtractor={(e, i) => `${i}-${e.ejercicioId}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialScrollIndex={actual}
          getItemLayout={(_, i) => ({ length: ancho, offset: ancho * i, index: i })}
          onMomentumScrollEnd={alDeslizar}
          renderItem={({ item, index }) => {
            const siguiente = enCurso.ejercicios[index + 1];
            return (
              <View style={{ width: ancho }}>
                <PaginaEjercicio
                  ejercicio={item}
                  datos={buscarEjercicioPorId(item.ejercicioId)}
                  indice={index}
                  total={total}
                  historial={historial}
                  marcadas={marcadasDe(index)}
                  siguiente={
                    siguiente
                      ? `${buscarEjercicioPorId(siguiente.ejercicioId)?.nombre ?? 'Ejercicio'} · ${objetivoDe(siguiente)}`
                      : null
                  }
                  espacioAbajo={espacioAbajo}
                  onEditar={(serie, cambios) => actualizar((s) => editarSerie(s, index, serie, cambios))}
                  onTildar={(serie) => tildar(index, serie)}
                  onBorrar={(serie) => borrar(index, serie)}
                  onAgregar={() => actualizar((s) => agregarSerie(s, index))}
                  onAnterior={() => irA(index - 1)}
                  onSiguiente={() => irA(index + 1)}
                  onTerminar={pedirTerminar}
                />
              </View>
            );
          }}
        />

        {/* Descanso, fijo abajo */}
        {enCurso.descanso && (
          <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, espacios.s) }]}>
            <BarraDescanso
              descanso={enCurso.descanso}
              onAjustar={(delta) => actualizar((s) => ajustarDescanso(s, delta, new Date()))}
              onSaltar={() => actualizar(terminarDescanso)}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.8 },

  cabecera: { paddingHorizontal: espacios.m, paddingTop: espacios.s, gap: espacios.xs },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacios.s + 4 },
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreSesion: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  cronometro: { color: colores.acento, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  botonTerminar: {
    paddingHorizontal: espacios.m,
    height: 40,
    borderRadius: radios.pill,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.tarjeta,
    justifyContent: 'center',
  },
  textoTerminar: { color: colores.texto, fontSize: 14, fontWeight: '800' },
  progreso: { flexDirection: 'row', gap: 4 },
  toqueSegmento: { flex: 1, paddingVertical: 14 },
  segmento: { height: 8, borderRadius: 4, backgroundColor: colores.pista, overflow: 'hidden' },
  segmentoActual: { borderWidth: 1, borderColor: colores.texto },
  rellenoSegmento: { height: '100%', backgroundColor: colores.acento },

  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: espacios.m,
    paddingTop: espacios.s,
    backgroundColor: colores.fondo,
  },
});
