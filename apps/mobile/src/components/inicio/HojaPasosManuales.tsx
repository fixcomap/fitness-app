import { Ionicons } from '@expo/vector-icons';
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

import { META_PASOS_MAXIMA, META_PASOS_MINIMA } from '../../lib/configuracion';
import { formatearNumero } from '../../lib/formato';
import { convertir, leerValor, MAXIMO, type CargaPasos, type DatosPaso, type TipoCarga } from '../../lib/pasosManuales';
import { colores } from '../../theme/tema';

interface HojaPasosManualesProps {
  visible: boolean;
  onCerrar: () => void;
  perfil: DatosPaso;
  cargasDeHoy: readonly CargaPasos[];
  onAgregar: (tipo: TipoCarga, valor: number) => void;
  onBorrar: (id: string) => void;
  metaPasos: number;
  onCambiarMeta: (valor: number) => number | null;
}

const UNIDAD: Record<TipoCarga, string> = { km: 'km', minutos: 'min' };

// Hoja que sube desde abajo para cargar lo que caminaste sin el celu.
export function HojaPasosManuales({
  visible,
  onCerrar,
  perfil,
  cargasDeHoy,
  onAgregar,
  onBorrar,
  metaPasos,
  onCambiarMeta,
}: HojaPasosManualesProps) {
  const insets = useSafeAreaInsets();
  const [tipo, setTipo] = useState<TipoCarga>('km');
  const [texto, setTexto] = useState('');
  const [textoMeta, setTextoMeta] = useState<string | null>(null); // null = no se está editando

  const valor = leerValor(texto, tipo);
  const estimado = valor === null ? null : convertir(tipo, valor, perfil);
  const hayError = texto.trim() !== '' && valor === null;

  const agregar = () => {
    if (valor === null) return;
    onAgregar(tipo, valor);
    setTexto('');
  };

  const guardarMeta = () => {
    if (textoMeta === null) return;
    const guardada = onCambiarMeta(Number(textoMeta.replace(/\./g, '')));
    if (guardada !== null) setTextoMeta(null);
  };
  const metaInvalida = textoMeta !== null && textoMeta.trim() !== '' && !/^\d[\d.]*$/.test(textoMeta.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
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

            <View style={styles.filaEntrada}>
              <View style={[styles.entrada, hayError && styles.entradaError]}>
                <TextInput
                  value={texto}
                  onChangeText={setTexto}
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
                disabled={valor === null}
                style={({ pressed }) => [styles.botonAgregar, valor === null && styles.deshabilitado, pressed && styles.presionado]}
                accessibilityRole="button"
              >
                <Text style={styles.textoAgregar}>Agregar</Text>
              </Pressable>
            </View>

            <Text style={[styles.ayuda, hayError && styles.textoError]}>
              {hayError
                ? `Poné un número entre 0 y ${MAXIMO[tipo]} ${UNIDAD[tipo]}.`
                : estimado
                  ? `≈ ${formatearNumero(estimado.pasos)} pasos · ${estimado.minutos} min activos`
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
                          · {String(c.valor).replace('.', ',')} {UNIDAD[c.tipo]} · {c.hora}
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

            {/* Meta diaria (configurable) */}
            <View style={styles.meta}>
              <Text style={styles.subtitulo}>Meta diaria de pasos</Text>
              {textoMeta === null ? (
                <Pressable onPress={() => setTextoMeta(String(metaPasos))} accessibilityRole="button" style={styles.filaMeta}>
                  <Text style={styles.valorMeta}>{formatearNumero(metaPasos)}</Text>
                  <Text style={styles.cambiar}>Cambiar</Text>
                </Pressable>
              ) : (
                <View style={styles.filaEntrada}>
                  <View style={[styles.entrada, metaInvalida && styles.entradaError]}>
                    <TextInput
                      value={textoMeta}
                      onChangeText={setTextoMeta}
                      keyboardType="number-pad"
                      style={styles.input}
                      autoFocus
                      accessibilityLabel="Meta diaria de pasos"
                      onSubmitEditing={guardarMeta}
                    />
                    <Text style={styles.unidad}>pasos</Text>
                  </View>
                  <Pressable onPress={guardarMeta} style={styles.botonAgregar} accessibilityRole="button">
                    <Text style={styles.textoAgregar}>Guardar</Text>
                  </Pressable>
                </View>
              )}
              {textoMeta !== null && (
                <Text style={styles.ayuda}>
                  Entre {formatearNumero(META_PASOS_MINIMA)} y {formatearNumero(META_PASOS_MAXIMA)}.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  meta: { gap: 8, marginTop: 4 },
  filaMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valorMeta: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  cambiar: { color: colores.acento, fontWeight: '700' },
});
