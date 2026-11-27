import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChatCoach } from '../hooks/useChatCoach';
import { useCoachHabilitado } from '../hooks/useCoachHabilitado';
import type { ErrorChat, MensajeGuardado } from '../lib/coach/chat';
import { colores, radios } from '../theme/tema';

// Lo mismo que acepta la API por mensaje.
const MAXIMO_TEXTO = 2000;

export function CoachScreen() {
  const { habilitado, desbloquearDev } = useCoachHabilitado();
  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo} accessibilityRole="header">
          Coach
        </Text>
      </View>
      {habilitado ? <Chat /> : <Bloqueado onDesbloquearDev={desbloquearDev} />}
    </SafeAreaView>
  );
}

function Chat() {
  const { listo, mensajes, enviando, error, enviar, reintentar } = useChatCoach();
  const [texto, setTexto] = useState('');
  // La lista va dada vuelta: el más nuevo abajo, pegado al campo de texto.
  const alReves = useMemo(() => [...mensajes].reverse(), [mensajes]);
  const puedeEnviar = listo && !enviando && texto.trim().length > 0;

  const mandar = () => {
    if (!puedeEnviar) return;
    enviar(texto);
    setTexto('');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {listo && mensajes.length === 0 ? (
        <Bienvenida />
      ) : (
        <FlatList
          inverted
          data={alReves}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <Burbuja mensaje={item} />}
          // Con la lista dada vuelta, el encabezado queda abajo de todo: debajo del último mensaje.
          ListHeaderComponent={<Estado enviando={enviando} error={error} onReintentar={reintentar} />}
          contentContainerStyle={styles.lista}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
      )}

      <View style={styles.barra}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribile a tu coach"
          placeholderTextColor={colores.textoSecundario}
          style={styles.campo}
          multiline
          maxLength={MAXIMO_TEXTO}
          accessibilityLabel="Mensaje para el coach"
        />
        <Pressable
          onPress={mandar}
          disabled={!puedeEnviar}
          style={({ pressed }) => [styles.enviar, !puedeEnviar && styles.deshabilitado, pressed && styles.presionado]}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          accessibilityState={{ disabled: !puedeEnviar }}
        >
          <Ionicons name="arrow-up" size={20} color={colores.texto} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Burbuja({ mensaje }: { mensaje: MensajeGuardado }) {
  const deUsuario = mensaje.rol === 'usuario';
  return (
    <View style={[styles.fila, deUsuario && styles.filaUsuario]}>
      <View style={[styles.burbuja, deUsuario ? styles.burbujaUsuario : styles.burbujaCoach]}>
        <Text style={styles.texto} selectable>
          {mensaje.texto}
        </Text>
      </View>
    </View>
  );
}

function Estado({ enviando, error, onReintentar }: { enviando: boolean; error: ErrorChat | null; onReintentar: () => void }) {
  if (enviando) {
    return (
      <View style={styles.fila}>
        <View style={[styles.burbuja, styles.burbujaCoach, styles.pensando]} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colores.textoSecundario} />
          <Text style={styles.textoPensando}>Pensando…</Text>
        </View>
      </View>
    );
  }
  if (!error) return null;
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle-outline" size={18} color={colores.acentoSuave} />
      <Text style={styles.textoError}>{error.mensaje}</Text>
      {error.reintentar && (
        <Pressable onPress={onReintentar} hitSlop={8} accessibilityRole="button">
          <Text style={styles.reintentar}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

function Bienvenida() {
  return (
    <View style={styles.bienvenida}>
      <View style={styles.avatar}>
        <Text style={styles.textoIa}>IA</Text>
      </View>
      <Text style={styles.tituloBienvenida}>¿En qué te ayudo?</Text>
      <Text style={styles.textoBienvenida}>
        Preguntame por tu entreno, tus comidas o tus pasos. También puedo armarte una rutina o cargar lo que comiste y
        caminaste: te muestro la propuesta y vos decidís si se aplica.
      </Text>
    </View>
  );
}

function Bloqueado({ onDesbloquearDev }: { onDesbloquearDev: (() => void) | null }) {
  return (
    <View style={styles.bienvenida}>
      <View style={[styles.avatar, styles.avatarCandado]}>
        <Ionicons name="lock-closed-outline" size={20} color={colores.oro} />
      </View>
      <Text style={styles.tituloBienvenida}>Tu coach es premium</Text>
      <Text style={styles.textoBienvenida}>
        Te arma rutinas, te ayuda con las comidas y carga lo que le contás, siempre con tu ok.
      </Text>
      {/* Todavía sin funcionalidad, como en Perfil. */}
      <Pressable style={({ pressed }) => [styles.botonOro, pressed && styles.presionado]} accessibilityRole="button">
        <Text style={styles.textoBotonOro}>Probar 7 días gratis</Text>
      </Pressable>
      {onDesbloquearDev && (
        <Pressable onPress={onDesbloquearDev} hitSlop={8} accessibilityRole="button">
          <Text style={styles.desbloquearDev}>Desbloquear para probar (solo desarrollo)</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  encabezado: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  titulo: { color: colores.texto, fontSize: 34, fontWeight: '800' },
  lista: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  fila: { flexDirection: 'row' },
  filaUsuario: { justifyContent: 'flex-end' },
  burbuja: { maxWidth: '85%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  burbujaUsuario: { backgroundColor: colores.acento, borderBottomRightRadius: 6 },
  burbujaCoach: { backgroundColor: colores.tarjeta, borderBottomLeftRadius: 6 },
  texto: { color: colores.texto, fontSize: 16, lineHeight: 22 },
  pensando: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textoPensando: { color: colores.textoSecundario, fontSize: 15 },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.medio,
    padding: 12,
  },
  textoError: { flex: 1, color: colores.texto, fontSize: 14, lineHeight: 19 },
  reintentar: { color: colores.acento, fontSize: 14, fontWeight: '800' },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  campo: {
    flex: 1,
    minHeight: 46,
    maxHeight: 130,
    backgroundColor: colores.tarjeta,
    borderRadius: 23,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: colores.texto,
    fontSize: 16,
  },
  enviar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deshabilitado: { backgroundColor: colores.tarjetaElevada },
  presionado: { opacity: 0.85 },
  bienvenida: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colores.oro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCandado: { backgroundColor: colores.tarjetaElevada },
  textoIa: { color: colores.textoSobreAcento, fontWeight: '800', fontSize: 18 },
  tituloBienvenida: { color: colores.texto, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  textoBienvenida: { color: colores.textoSecundario, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  botonOro: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: radios.pill,
    backgroundColor: colores.oro,
    justifyContent: 'center',
    marginTop: 8,
  },
  textoBotonOro: { color: colores.textoSobreAcento, fontSize: 15, fontWeight: '800' },
  desbloquearDev: { color: colores.textoSecundario, fontSize: 13, textDecorationLine: 'underline', marginTop: 4 },
});
