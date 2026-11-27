import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { coloresSesion as c, medidasSesion as m } from '../components/entreno/estiloSesion';
import { buscarEjercicioPorId } from '../data/ejercicios';
import type { Ejercicio } from '../data/tipos';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useEntreno } from '../estado/Entreno';
import { rangoPorDefecto, REPS_MAX, REPS_MIN } from '../lib/entreno/rangos';
import {
  agregarEjercicios,
  ajustarRepsDe,
  ajustarSeries,
  alternarDia,
  conflictoDeDia,
  DIAS_SEMANA,
  duracionEstimadaMin,
  errorRutina,
  INICIAL_DIA,
  moverEjercicio,
  NOMBRE_DIA,
  nuevaRutina,
  quitarEjercicio,
  SERIES_MAX,
  SERIES_MIN,
  textoDias,
  type DiaSemana,
  type EjercicioRutina,
  type Rutina,
} from '../lib/entreno/rutinas';
import { CatalogoScreen } from './CatalogoScreen';

interface EditarRutinaScreenProps {
  rutinaId?: string; // sin id: rutina nueva
  dia?: DiaSemana; // para una nueva: el día que ya viene marcado
  // Desde el coach: la rutina como la propone (precargada) y qué hacer al guardar en vez de guardarla acá.
  propuesta?: { rutina: Rutina; onGuardar: (rutina: Rutina) => void };
  onCerrar: () => void;
}

const nuevoId = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Editor de una rutina: nombre, días, ejercicios (orden, series y rango de reps).
export function EditarRutinaScreen({ rutinaId, dia, propuesta, onCerrar }: EditarRutinaScreenProps) {
  const insets = useSafeAreaInsets();
  const { perfil } = useDatosDelDia();
  const { rutinas, guardarRutina, borrarRutina } = useEntreno();
  const original = rutinas.find((r) => r.id === (propuesta?.rutina.id ?? rutinaId)) ?? null;
  const [borrador, setBorrador] = useState<Rutina>(
    () => propuesta?.rutina ?? original ?? nuevaRutina(nuevoId(), dia === undefined ? [] : [dia]),
  );
  // Lo que propuso el coach todavía no está guardado: cancelar pregunta si se descarta.
  const [cambiado, setCambiado] = useState(propuesta !== undefined);
  const [enfocado, setEnfocado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ejercicios tildados en el catálogo (modo selección), o null si está cerrado.
  const [eligiendo, setEligiendo] = useState<ReadonlySet<string> | null>(null);

  const cambiar = (cambio: (r: Rutina) => Rutina) => {
    setBorrador(cambio);
    setCambiado(true);
    setError(null);
  };

  const cancelar = () => {
    if (!cambiado) return onCerrar();
    Alert.alert('¿Descartar los cambios?', undefined, [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: onCerrar },
    ]);
  };

  const pedirBorrar = () => {
    if (!original) return;
    Alert.alert(`¿Borrar "${original.nombre}"?`, 'Las sesiones que ya hiciste quedan en el historial.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          borrarRutina(original.id);
          onCerrar();
        },
      },
    ]);
  };

  // Un día, una rutina: si el día ya es de otra, se pregunta si se reemplaza.
  const tocarDia = (d: DiaSemana) => {
    const otra = borrador.dias.includes(d) ? null : conflictoDeDia(rutinas, borrador.id, d);
    if (!otra) return cambiar((r) => alternarDia(r, d));
    Alert.alert(`El ${NOMBRE_DIA[d]} ya tiene "${otra.nombre}"`, '¿Querés reemplazarla por esta rutina ese día?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reemplazar', onPress: () => cambiar((r) => alternarDia(r, d)) },
    ]);
  };

  const guardar = () => {
    const problema = errorRutina(borrador);
    if (problema) return setError(problema);
    if (propuesta) propuesta.onGuardar(borrador);
    else guardarRutina(borrador);
    onCerrar();
  };

  const alternarElegido = (e: Ejercicio) =>
    setEligiendo((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(e.id)) nuevo.delete(e.id);
      else nuevo.add(e.id);
      return nuevo;
    });

  const agregarElegidos = () => {
    const nuevos = [...(eligiendo ?? [])].flatMap((id) => {
      const e = buscarEjercicioPorId(id);
      return e ? [{ ejercicioId: id, rango: rangoPorDefecto(e, perfil.objetivo) }] : [];
    });
    cambiar((r) => agregarEjercicios(r, nuevos));
    setEligiendo(null);
  };

  const minutos = duracionEstimadaMin(borrador);

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      {/* Encabezado */}
      <View style={styles.encabezado}>
        <Pressable onPress={cancelar} hitSlop={8} accessibilityRole="button" style={styles.ladoEncabezado}>
          <Text style={styles.textoEncabezado}>Cancelar</Text>
        </Pressable>
        <Text style={styles.titulo} accessibilityRole="header">
          {original ? 'Editar rutina' : 'Nueva rutina'}
        </Text>
        <View style={[styles.ladoEncabezado, styles.derecha]}>
          {original && !propuesta && (
            <Pressable onPress={pedirBorrar} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.textoEncabezado, styles.textoBorrar]}>Borrar</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingBottom: 110 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.etiqueta}>Nombre</Text>
        <TextInput
          value={borrador.nombre}
          onChangeText={(nombre) => cambiar((r) => ({ ...r, nombre }))}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          placeholder="Ej.: Empuje: pecho y hombros"
          placeholderTextColor={c.textoTenue}
          maxLength={40}
          returnKeyType="done"
          style={[styles.nombre, enfocado && styles.nombreEnfocado]}
          accessibilityLabel="Nombre de la rutina"
        />

        <Text style={[styles.etiqueta, styles.separacion]}>Días</Text>
        <View style={styles.dias}>
          {DIAS_SEMANA.map((d) => {
            const marcado = borrador.dias.includes(d);
            const deOtra = !marcado && conflictoDeDia(rutinas, borrador.id, d) !== null;
            return (
              <Pressable
                key={d}
                onPress={() => tocarDia(d)}
                style={({ pressed }) => [
                  styles.dia,
                  marcado ? styles.diaMarcado : deOtra ? styles.diaDeOtra : styles.diaLibre,
                  pressed && styles.presionado,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: marcado }}
                accessibilityLabel={`${NOMBRE_DIA[d]}${deOtra ? ', ya tiene otra rutina' : ''}`}
              >
                <Text style={[styles.letraDia, deOtra && styles.letraDiaDeOtra]}>{INICIAL_DIA[d]}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.ayuda}>{textoDias(borrador.dias)}</Text>

        <View style={[styles.filaEtiqueta, styles.separacion]}>
          <Text style={styles.etiqueta}>Ejercicios</Text>
          {borrador.ejercicios.length > 0 && (
            <Text style={styles.ayuda}>
              {borrador.ejercicios.length} · ~{minutos} min
            </Text>
          )}
        </View>

        {borrador.ejercicios.map((e, i) => (
          <TarjetaEjercicio
            key={e.ejercicioId}
            ejercicio={e}
            esPrimero={i === 0}
            esUltimo={i === borrador.ejercicios.length - 1}
            onMover={(delta) => cambiar((r) => moverEjercicio(r, i, delta))}
            onSeries={(delta) => cambiar((r) => ajustarSeries(r, i, delta))}
            onReps={(extremo, delta) => cambiar((r) => ajustarRepsDe(r, i, extremo, delta))}
            onQuitar={() => cambiar((r) => quitarEjercicio(r, i))}
          />
        ))}

        <Pressable
          onPress={() => setEligiendo(new Set())}
          style={({ pressed }) => [styles.botonAgregar, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoAgregar}>+ Agregar ejercicio</Text>
        </Pressable>
      </ScrollView>

      {/* Guardar */}
      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <Pressable
          onPress={guardar}
          style={({ pressed }) => [styles.botonGuardar, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoGuardar}>{propuesta ? 'Guardar y aplicar' : 'Guardar rutina'}</Text>
        </Pressable>
      </View>

      {/* Catálogo en modo selección */}
      <Modal
        visible={eligiendo !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setEligiendo(null)}
      >
        <CatalogoScreen
          seleccion={{
            elegidos: eligiendo ?? new Set(),
            yaAgregados: new Set(borrador.ejercicios.map((e) => e.ejercicioId)),
            onAlternar: alternarElegido,
            onCancelar: () => setEligiendo(null),
            onListo: agregarElegidos,
          }}
        />
      </Modal>
    </View>
  );
}

interface TarjetaEjercicioProps {
  ejercicio: EjercicioRutina;
  esPrimero: boolean;
  esUltimo: boolean;
  onMover: (delta: number) => void;
  onSeries: (delta: number) => void;
  onReps: (extremo: 'min' | 'max', delta: number) => void;
  onQuitar: () => void;
}

// Un ejercicio en el editor: ↑/↓ para ordenar, series ±, reps mínimas y máximas ±, ✕.
function TarjetaEjercicio({
  ejercicio,
  esPrimero,
  esUltimo,
  onMover,
  onSeries,
  onReps,
  onQuitar,
}: TarjetaEjercicioProps) {
  const nombre = buscarEjercicioPorId(ejercicio.ejercicioId)?.nombre ?? 'Ejercicio';
  const { series, rango } = ejercicio;
  return (
    <View style={styles.tarjeta}>
      <View style={styles.flechas}>
        <BotonIcono
          icono="chevron-up"
          etiqueta={`Subir ${nombre}`}
          deshabilitado={esPrimero}
          onPress={() => onMover(-1)}
        />
        <BotonIcono
          icono="chevron-down"
          etiqueta={`Bajar ${nombre}`}
          deshabilitado={esUltimo}
          onPress={() => onMover(1)}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.nombreEjercicio} numberOfLines={2}>
          {nombre}
        </Text>
        <View style={styles.controles}>
          <View style={styles.paso}>
            <BotonPaso
              tipo="remove"
              etiqueta="Una serie menos"
              deshabilitado={series <= SERIES_MIN}
              onPress={() => onSeries(-1)}
            />
            <Text style={styles.valor}>
              {series} <Text style={styles.unidad}>{series === 1 ? 'serie' : 'series'}</Text>
            </Text>
            <BotonPaso
              tipo="add"
              etiqueta="Una serie más"
              deshabilitado={series >= SERIES_MAX}
              onPress={() => onSeries(1)}
            />
          </View>
          <View style={styles.paso}>
            <BotonPaso
              tipo="remove"
              etiqueta="Bajar las reps mínimas"
              deshabilitado={rango.min <= REPS_MIN}
              onPress={() => onReps('min', -1)}
            />
            <Text style={styles.valorCorto} accessibilityLabel={`de ${rango.min} a ${rango.max} repeticiones`}>
              {rango.min}
            </Text>
            <BotonPaso
              tipo="add"
              etiqueta="Subir las reps mínimas"
              deshabilitado={rango.min >= rango.max}
              onPress={() => onReps('min', 1)}
            />
            <Text style={styles.separador} {...oculto}>
              {'//'}
            </Text>
            <BotonPaso
              tipo="remove"
              etiqueta="Bajar las reps máximas"
              deshabilitado={rango.max <= rango.min}
              onPress={() => onReps('max', -1)}
            />
            <Text style={styles.valorCorto} {...oculto}>
              {rango.max}
            </Text>
            <BotonPaso
              tipo="add"
              etiqueta="Subir las reps máximas"
              deshabilitado={rango.max >= REPS_MAX}
              onPress={() => onReps('max', 1)}
            />
            <Text style={styles.unidad} {...oculto}>
              reps
            </Text>
          </View>
        </View>
      </View>
      <BotonIcono icono="close" etiqueta={`Quitar ${nombre}`} onPress={onQuitar} />
    </View>
  );
}

function BotonIcono({
  icono,
  etiqueta,
  deshabilitado = false,
  onPress,
}: {
  icono: 'chevron-up' | 'chevron-down' | 'close';
  etiqueta: string;
  deshabilitado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={6}
      style={({ pressed }) => [styles.botonIcono, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
    >
      <Ionicons
        name={icono}
        size={20}
        color={deshabilitado ? c.pistaAnillo : icono === 'close' ? c.textoTenue : c.blanco}
      />
    </Pressable>
  );
}

function BotonPaso({
  tipo,
  etiqueta,
  deshabilitado,
  onPress,
}: {
  tipo: 'add' | 'remove';
  etiqueta: string;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={4}
      style={({ pressed }) => [styles.botonPaso, deshabilitado && styles.deshabilitado, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
    >
      <Ionicons name={tipo} size={16} color={c.blanco} />
    </Pressable>
  );
}

// El rango se lee entero en el número mínimo ("de 6 a 10 repeticiones"); el resto no se anuncia.
const oculto = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

const DIA = 46;
const PASO = 32;

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.75 },
  deshabilitado: { opacity: 0.35 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: m.margen,
    paddingTop: 10,
    paddingBottom: 12,
  },
  ladoEncabezado: { width: 80 },
  derecha: { alignItems: 'flex-end' },
  textoEncabezado: { color: c.blanco, fontSize: 16, fontWeight: '800' },
  textoBorrar: { color: c.textoTenue },
  titulo: { flex: 1, textAlign: 'center', color: c.blanco, fontSize: 17, fontWeight: '900' },
  contenido: { paddingHorizontal: m.margen, gap: 10 },
  etiqueta: { color: c.textoTenue, fontSize: 13, fontWeight: '800' },
  separacion: { marginTop: 10 },
  filaEtiqueta: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  ayuda: { color: c.textoTenue, fontSize: 13 },
  nombre: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: c.superficie,
    paddingHorizontal: 18,
    color: c.blanco,
    fontSize: 20,
    fontWeight: '900',
  },
  nombreEnfocado: { borderColor: c.rojo },
  dias: { flexDirection: 'row', justifyContent: 'space-between' },
  dia: {
    width: DIA,
    height: DIA,
    borderRadius: DIA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  diaMarcado: { backgroundColor: c.rojo, borderColor: c.rojo },
  diaLibre: { backgroundColor: c.superficie, borderColor: c.superficie },
  // Días que ya tienen otra rutina: sólo el borde y la letra apagada.
  diaDeOtra: { backgroundColor: 'transparent', borderColor: c.pista },
  letraDia: { color: c.blanco, fontSize: 15, fontWeight: '900' },
  letraDiaDeOtra: { color: c.letraApagada },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: c.superficie,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  flechas: { gap: 6 },
  botonIcono: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  nombreEjercicio: { color: c.blanco, fontSize: 16, fontWeight: '900', marginTop: 5, marginBottom: 8 },
  controles: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botonPaso: {
    width: PASO,
    height: PASO,
    borderRadius: PASO / 2,
    backgroundColor: c.pista,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: { color: c.blanco, fontSize: 15, fontWeight: '900', minWidth: 62, textAlign: 'center' },
  valorCorto: { color: c.blanco, fontSize: 15, fontWeight: '900', minWidth: 20, textAlign: 'center' },
  unidad: { color: c.blanco, fontSize: 14, fontWeight: '500' },
  separador: { color: c.rojo, fontSize: 15, fontWeight: '900' },
  botonAgregar: {
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.bordeDiscontinuo,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  textoAgregar: { color: c.textoBoton, fontSize: 16, fontWeight: '800' },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: m.margen,
    paddingTop: 10,
    backgroundColor: c.fondo,
    gap: 8,
  },
  error: { color: c.rojoSuave, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  botonGuardar: {
    height: 60,
    borderRadius: 30,
    backgroundColor: c.rojo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoGuardar: { color: c.blanco, fontSize: 18, fontWeight: '900' },
});
