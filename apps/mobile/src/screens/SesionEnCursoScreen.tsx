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
import { HojaTecnica } from '../components/entreno/HojaTecnica';
import { coloresSesion as c, medidasSesion as m } from '../components/entreno/estiloSesion';
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

// Alto de la barra de descanso flotante, para que no tape el final de la página.
const ALTO_BARRA_DESCANSO = 92;
const MARGEN_BARRA = 10;

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
  // Ejercicio cuya técnica se está mirando (hoja desde abajo), o null.
  const [tecnicaDe, setTecnicaDe] = useState<string | null>(null);
  const actual = enCurso?.actual ?? 0;

  // Si el ejercicio cambia por un botón o la barra de arriba, se desliza hasta él.
  useEffect(() => {
    lista.current?.scrollToIndex({ index: actual, animated: true });
  }, [actual]);

  if (!enCurso) {
    return <View style={styles.pantalla} />;
  }

  const total = enCurso.ejercicios.length;
  const ejercicioTecnica = tecnicaDe ? buscarEjercicioPorId(tecnicaDe) : undefined;
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

  // ✕: salir sin terminar. Se puede minimizar (la sesión sigue) o descartarla.
  const pedirSalir = () => {
    Alert.alert('¿Salir de la sesión?', 'Podés seguirla después desde Entreno o Inicio.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar sesión',
        style: 'destructive',
        onPress: () => {
          descartar();
          onDescartada();
        },
      },
      { text: 'Minimizar', onPress: onMinimizar },
    ]);
  };

  const margenAbajo = Math.max(insets.bottom, MARGEN_BARRA);
  const espacioAbajo = enCurso.descanso ? ALTO_BARRA_DESCANSO + margenAbajo : margenAbajo;

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Arriba: nombre, cronómetro total, Terminar y progreso por ejercicio */}
        <View style={styles.cabecera}>
          <View style={styles.filaCabecera}>
            <Pressable
              onPress={pedirSalir}
              hitSlop={8}
              style={({ pressed }) => [styles.botonRedondo, pressed && styles.presionado]}
              accessibilityRole="button"
              accessibilityLabel="Salir de la sesión"
              accessibilityHint="Minimizarla o descartarla"
            >
              <Ionicons name="close" size={20} color={c.blanco} />
            </Pressable>
            <View style={styles.centroCabecera}>
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
                {/* Hecho: rojo. Actual: blanco. Pendiente: gris, con lo que ya se hizo en rojo. */}
                <View style={[styles.segmento, i === actual && styles.segmentoActual]}>
                  {i !== actual && <View style={[styles.rellenoSegmento, { width: `${Math.round(p * 100)}%` }]} />}
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
                  onVerTecnica={() => setTecnicaDe(item.ejercicioId)}
                />
              </View>
            );
          }}
        />

        {/* Descanso, flotando abajo */}
        {enCurso.descanso && (
          <View style={[styles.pie, { bottom: margenAbajo }]}>
            <BarraDescanso
              descanso={enCurso.descanso}
              onAjustar={(delta) => actualizar((s) => ajustarDescanso(s, delta, new Date()))}
              onSaltar={() => actualizar(terminarDescanso)}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* La sesión sigue debajo: el descanso no se corta. */}
      {ejercicioTecnica && <HojaTecnica ejercicio={ejercicioTecnica} onCerrar={() => setTecnicaDe(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.8 },

  cabecera: { paddingHorizontal: m.margen, paddingTop: 8 },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botonRedondo: {
    width: m.botonRedondo,
    height: m.botonRedondo,
    borderRadius: m.botonRedondo / 2,
    backgroundColor: c.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroCabecera: { flex: 1, alignItems: 'center' },
  nombreSesion: { color: c.textoTenue, fontSize: 13 },
  cronometro: { color: c.blanco, fontSize: 19, fontWeight: '900', marginTop: 2, fontVariant: ['tabular-nums'] },
  botonTerminar: {
    height: m.botonRedondo,
    paddingHorizontal: 18,
    borderRadius: m.botonRedondo / 2,
    backgroundColor: c.superficie,
    justifyContent: 'center',
  },
  textoTerminar: { color: c.blanco, fontSize: 14, fontWeight: '800' },
  // La línea es fina como en el diseño, pero cada segmento se toca en 34 pt de alto.
  progreso: { flexDirection: 'row', gap: 5, marginTop: 4 },
  toqueSegmento: { flex: 1, paddingVertical: 14 },
  segmento: { height: 5, borderRadius: 2.5, backgroundColor: c.pista, overflow: 'hidden' },
  segmentoActual: { backgroundColor: c.blanco },
  rellenoSegmento: { height: '100%', backgroundColor: c.rojo },

  pie: { position: 'absolute', left: MARGEN_BARRA, right: MARGEN_BARRA },
});
