import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatearNumero } from '../../lib/formato';
import {
  convertir,
  descontarRegistrado,
  fijarHora,
  franjaPorDefecto,
  horaMinutos,
  leerValor,
  MAXIMO,
  moverFranja,
  PASO_FRANJA_MIN,
  textoDescuento,
  validarCarga,
  type CargaPasos,
  type DatosPaso,
  type Franja,
  type TipoCarga,
} from '../../lib/pasosManuales';
import { colores } from '../../theme/tema';

interface HojaPasosManualesProps {
  visible: boolean;
  onCerrar: () => void;
  perfil: DatosPaso;
  cargasDeHoy: readonly CargaPasos[];
  onAgregar: (tipo: TipoCarga, valor: number, franja: Franja) => Promise<CargaPasos>;
  conPodometro: boolean; // si se descuenta lo que el celu ya contó
  onBorrar: (id: string) => void;
  metaPasos: number;
  onAbrirPerfil: () => void; // la meta se cambia en el perfil
}

const UNIDAD: Record<TipoCarga, string> = { km: 'km', minutos: 'min' };

type Extremo = 'inicio' | 'fin';

// Hoja que sube desde abajo para cargar lo que caminaste sin el celu.
export function HojaPasosManuales({
  visible,
  onCerrar,
  perfil,
  cargasDeHoy,
  onAgregar,
  conPodometro,
  onBorrar,
  metaPasos,
  onAbrirPerfil,
}: HojaPasosManualesProps) {
  const insets = useSafeAreaInsets();
  const [tipo, setTipo] = useState<TipoCarga>('km');
  const [texto, setTexto] = useState('');
  const [franja, setFranja] = useState<Franja>(() => franjaPorDefecto(new Date()));
  const [agregando, setAgregando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [avisoHora, setAvisoHora] = useState<string | null>(null);
  // iOS: el selector se muestra dentro de la hoja (abrir otro modal encima no funciona bien).
  const [editando, setEditando] = useState<{ extremo: Extremo; hora: Date } | null>(null);

  const valor = leerValor(texto, tipo);
  const estimado = valor === null ? null : convertir(tipo, valor, perfil);
  const errorFranja = valor === null ? null : validarCarga(tipo, valor, franja);
  const hayError = texto.trim() !== '' && valor === null;
  const marcarError = hayError || errorFranja !== null;
  const puedeAgregar = valor !== null && errorFranja === null && !agregando;

  // Cada vez que se abre, el horario vuelve a ser la última hora.
  const alAbrir = () => {
    setFranja(franjaPorDefecto(new Date()));
    setResultado(null);
    setAvisoHora(null);
    setEditando(null);
  };

  // Atajo de ± 15 min.
  const mover = (extremo: Extremo, delta: number) => {
    setFranja((f) => moverFranja(f, extremo, delta, new Date()));
    setResultado(null);
    setAvisoHora(null);
  };

  // Hora exacta elegida en el selector; si no es válida se ajusta y se avisa.
  const fijar = (extremo: Extremo, hora: Date) => {
    const { franja: nueva, aviso } = fijarHora(franja, extremo, hora, new Date());
    setFranja(nueva);
    setAvisoHora(aviso);
    setResultado(null);
  };

  const abrirSelector = (extremo: Extremo) => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: franja[extremo],
        mode: 'time',
        is24Hour: true,
        onValueChange: (_evento, hora) => fijar(extremo, hora),
      });
      return;
    }
    setEditando({ extremo, hora: franja[extremo] });
  };

  const confirmarSelector = () => {
    if (editando) fijar(editando.extremo, editando.hora);
    setEditando(null);
  };

  const agregar = async () => {
    if (!puedeAgregar || valor === null) return;
    setAgregando(true);
    try {
      const carga = await onAgregar(tipo, valor, franja);
      const descuento = descontarRegistrado(carga.estimado ?? carga.pasos, carga.registrado ?? 0);
      setResultado(textoDescuento(descuento, conPodometro));
      setTexto('');
    } finally {
      setAgregando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar} onShow={alAbrir}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" />
        <View style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.manija} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.contenido}>
            <Text style={styles.titulo}>¿Cuánto caminaste sin el celu?</Text>

            {/* km o minutos */}
            <View style={styles.selector}>
              {(['km', 'minutos'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setTipo(t)}
                  style={[styles.opcion, tipo === t && styles.opcionActiva]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: tipo === t }}
                >
                  <Text style={[styles.textoOpcion, tipo === t && styles.textoOpcionActiva]}>
                    {t === 'km' ? 'Kilómetros' : 'Minutos'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Horario: por defecto la última hora */}
            <View style={styles.franja}>
              <SelectorHora
                etiqueta="Desde"
                fecha={franja.inicio}
                activo={editando?.extremo === 'inicio'}
                onMover={(d) => mover('inicio', d)}
                onElegir={() => abrirSelector('inicio')}
              />
              <SelectorHora
                etiqueta="Hasta"
                fecha={franja.fin}
                activo={editando?.extremo === 'fin'}
                onMover={(d) => mover('fin', d)}
                onElegir={() => abrirSelector('fin')}
              />
            </View>

            {editando && (
              <View style={styles.panelHora}>
                <DateTimePicker
                  value={editando.hora}
                  mode="time"
                  display="spinner"
                  minuteInterval={1}
                  locale="es-AR"
                  themeVariant="dark"
                  onValueChange={(_evento, hora) => setEditando({ ...editando, hora })}
                />
                <View style={styles.accionesHora}>
                  <Pressable onPress={() => setEditando(null)} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.cancelarHora}>Cancelar</Text>
                  </Pressable>
                  <Pressable onPress={confirmarSelector} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.listoHora}>Listo</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {avisoHora !== null && (
              <Text style={styles.avisoHora} accessibilityLiveRegion="polite">
                {avisoHora}
              </Text>
            )}

            <View style={styles.filaEntrada}>
              <View style={[styles.entrada, marcarError && styles.entradaError]}>
                <TextInput
                  value={texto}
                  onChangeText={(t) => {
                    setTexto(t);
                    setResultado(null);
                  }}
                  placeholder={tipo === 'km' ? '2,5' : '30'}
                  placeholderTextColor="#5C5C5C"
                  keyboardType="decimal-pad"
                  style={styles.input}
                  accessibilityLabel={tipo === 'km' ? 'Kilómetros caminados' : 'Minutos caminados'}
                  returnKeyType="done"
                  onSubmitEditing={agregar}
                />
                <Text style={styles.unidad}>{UNIDAD[tipo]}</Text>
              </View>
              <Pressable
                onPress={agregar}
                disabled={!puedeAgregar}
                style={({ pressed }) => [styles.botonAgregar, !puedeAgregar && styles.deshabilitado, pressed && styles.presionado]}
                accessibilityRole="button"
              >
                <Text style={styles.textoAgregar}>{agregando ? '…' : 'Agregar'}</Text>
              </Pressable>
            </View>

            {resultado !== null && (
              <View style={styles.resultado} accessibilityLiveRegion="polite">
                <Ionicons name="checkmark-circle" size={18} color={colores.verde} />
                <Text style={styles.textoResultado}>{resultado}</Text>
              </View>
            )}

            <Text style={[styles.ayuda, marcarError && styles.textoError]}>
              {hayError
                ? `Poné un número entre 0 y ${MAXIMO[tipo]} ${UNIDAD[tipo]}.`
                : errorFranja
                  ? errorFranja
                : estimado
                  ? `≈ ${formatearNumero(estimado.pasos)} pasos estimados${conPodometro ? ' · descontamos lo que el celu ya contó en ese horario' : ''}`
                  : tipo === 'km'
                    ? 'Calculamos los pasos con tu altura y los minutos a 5 km/h.'
                    : 'Contamos 100 pasos por minuto.'}
            </Text>

            {/* Cargas de hoy */}
            <Text style={styles.subtitulo}>Cargado hoy</Text>
            {cargasDeHoy.length === 0 ? (
              <Text style={styles.ayuda}>Todavía no cargaste nada hoy.</Text>
            ) : (
              <View style={styles.lista}>
                {cargasDeHoy.map((c) => (
                  <View key={c.id} style={styles.carga}>
                    <View style={styles.flex}>
                      <Text style={styles.textoCarga}>
                        {formatearNumero(c.pasos)} pasos{' '}
                        <Text style={styles.detalleCarga}>
                          · {String(c.valor).replace('.', ',')} {UNIDAD[c.tipo]} · {c.inicio ? `${c.inicio}–${c.hora}` : c.hora}
                        </Text>
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => onBorrar(c.id)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Borrar carga de ${formatearNumero(c.pasos)} pasos`}
                    >
                      <Ionicons name="trash-outline" size={20} color={colores.acento} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Meta diaria: se cambia en el perfil */}
            <Pressable
              onPress={() => {
                onCerrar();
                onAbrirPerfil();
              }}
              style={styles.filaMeta}
              accessibilityRole="link"
            >
              <Text style={styles.ayuda}>Meta diaria: {formatearNumero(metaPasos)} pasos</Text>
              <Text style={styles.cambiar}>Cambiar en tu perfil</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface SelectorHoraProps {
  etiqueta: string;
  fecha: Date;
  activo: boolean; // el selector de esta hora está abierto
  onMover: (delta: number) => void;
  onElegir: () => void;
}

function SelectorHora({ etiqueta, fecha, activo, onMover, onElegir }: SelectorHoraProps) {
  return (
    <View style={styles.selectorHora}>
      <Text style={styles.etiquetaHora}>{etiqueta}</Text>
      <View style={styles.filaHora}>
        <Pressable
          onPress={() => onMover(-PASO_FRANJA_MIN)}
          hitSlop={6}
          style={styles.botonHora}
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: ${PASO_FRANJA_MIN} minutos antes`}
        >
          <Ionicons name="remove" size={18} color={colores.texto} />
        </Pressable>
        <Pressable
          onPress={onElegir}
          hitSlop={6}
          style={({ pressed }) => [styles.botonHoraExacta, (pressed || activo) && styles.horaActiva]}
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: ${horaMinutos(fecha)}. Tocá para elegir la hora exacta`}
        >
          <Text style={styles.hora}>{horaMinutos(fecha)}</Text>
        </Pressable>
        <Pressable
          onPress={() => onMover(PASO_FRANJA_MIN)}
          hitSlop={6}
          style={styles.botonHora}
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: ${PASO_FRANJA_MIN} minutos después`}
        >
          <Ionicons name="add" size={18} color={colores.texto} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  franja: { flexDirection: 'row', gap: 10 },
  selectorHora: { flex: 1, backgroundColor: colores.fondo, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  etiquetaHora: { color: colores.textoSecundario, fontSize: 12 },
  filaHora: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botonHora: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hora: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  botonHoraExacta: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  horaActiva: { backgroundColor: colores.tarjetaElevada },
  panelHora: { backgroundColor: colores.fondo, borderRadius: 14, paddingBottom: 10 },
  accionesHora: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  cancelarHora: { color: colores.textoSecundario, fontSize: 15, fontWeight: '700' },
  listoHora: { color: colores.acento, fontSize: 15, fontWeight: '800' },
  avisoHora: { color: colores.acentoSuave, fontSize: 12, marginTop: -4 },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colores.verdeFondo, borderRadius: 12, padding: 12 },
  textoResultado: { flex: 1, color: colores.texto, fontSize: 13, fontWeight: '600' },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: {
    backgroundColor: colores.tarjeta,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  manija: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#444', marginTop: 10 },
  contenido: { padding: 20, gap: 12 },
  titulo: { color: colores.texto, fontSize: 21, fontWeight: '800' },
  selector: { flexDirection: 'row', backgroundColor: colores.fondo, borderRadius: 14, padding: 4 },
  opcion: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  opcionActiva: { backgroundColor: colores.tarjetaElevada },
  textoOpcion: { color: colores.textoSecundario, fontWeight: '700' },
  textoOpcionActiva: { color: colores.texto },
  filaEntrada: { flexDirection: 'row', gap: 10 },
  entrada: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.fondo,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  entradaError: { borderColor: colores.acento },
  input: { flex: 1, color: colores.texto, fontSize: 22, fontWeight: '800', paddingVertical: 12 },
  unidad: { color: colores.textoSecundario, fontSize: 15 },
  botonAgregar: {
    backgroundColor: colores.acento,
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  deshabilitado: { opacity: 0.4 },
  presionado: { opacity: 0.85 },
  textoAgregar: { color: colores.texto, fontWeight: '800', fontSize: 15 },
  ayuda: { color: colores.textoSecundario, fontSize: 13 },
  textoError: { color: colores.acentoSuave },
  subtitulo: { color: colores.texto, fontSize: 15, fontWeight: '700', marginTop: 8 },
  lista: { gap: 8 },
  carga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.fondo,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textoCarga: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  detalleCarga: { color: colores.textoSecundario, fontWeight: '400' },
  filaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingVertical: 6 },
  cambiar: { color: colores.acento, fontWeight: '700' },
});
