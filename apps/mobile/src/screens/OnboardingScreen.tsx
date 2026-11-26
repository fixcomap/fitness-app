import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CamposDatos, CamposObjetivos } from '../components/perfil/CamposPerfil';
import { ResumenMetas } from '../components/perfil/ResumenMetas';
import {
  BORRADOR_VACIO,
  erroresDe,
  erroresPerfil,
  metasNutricion,
  perfilDesdeBorrador,
  type BorradorPerfil,
  type CampoPerfil,
  type PerfilUsuario,
} from '../lib/perfil';
import { colores, espacios, radios } from '../theme/tema';

// Los campos que se validan en cada paso (el tercero es el resultado).
const CAMPOS_PASO: readonly (readonly CampoPerfil[])[] = [
  ['nombre', 'sexo', 'edad', 'alturaCm', 'pesoKg'],
  ['objetivoPeso', 'objetivo', 'diasEntrenoPorSemana'],
];
const TITULOS = ['Contanos de vos', 'Tus objetivos', 'Tu plan'];
const TOTAL_PASOS = 3;

// La primera vez: datos, objetivos y el resultado con las kcal calculadas.
export function OnboardingScreen({ onListo }: { onListo: (perfil: PerfilUsuario) => void }) {
  const insets = useSafeAreaInsets();
  const [paso, setPaso] = useState(0);
  const [borrador, setBorrador] = useState<BorradorPerfil>(BORRADOR_VACIO);
  // Los errores se muestran recién después de intentar seguir.
  const [intentado, setIntentado] = useState(false);

  const errores = erroresPerfil(borrador);
  const erroresPaso = paso < CAMPOS_PASO.length ? erroresDe(errores, CAMPOS_PASO[paso]) : {};
  const perfil = perfilDesdeBorrador(borrador);

  const cambiar = (cambios: Partial<BorradorPerfil>) => setBorrador((b) => ({ ...b, ...cambios }));

  const seguir = () => {
    if (Object.keys(erroresPaso).length > 0) return setIntentado(true);
    setIntentado(false);
    if (paso < TOTAL_PASOS - 1) setPaso(paso + 1);
    else if (perfil) onListo(perfil);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.pantalla, { paddingTop: insets.top + espacios.m }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.encabezado}>
        <View style={styles.pasos}>
          {Array.from({ length: TOTAL_PASOS }, (_, i) => (
            <View key={i} style={[styles.barraPaso, i <= paso && styles.barraPasoHecha]} />
          ))}
        </View>
        <Text style={styles.numeroPaso}>
          Paso {paso + 1} de {TOTAL_PASOS}
        </Text>
        <Text style={styles.titulo} accessibilityRole="header">
          {TITULOS[paso]}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        {paso === 0 && <CamposDatos borrador={borrador} errores={intentado ? erroresPaso : {}} onCambiar={cambiar} />}
        {paso === 1 && (
          <CamposObjetivos borrador={borrador} errores={intentado ? erroresPaso : {}} onCambiar={cambiar} />
        )}
        {paso === 2 && perfil && (
          <View style={styles.resultado}>
            <Text style={styles.texto}>
              {perfil.nombre}, con tus datos y {perfil.diasEntrenoPorSemana}{' '}
              {perfil.diasEntrenoPorSemana === 1 ? 'día' : 'días'} de entreno por semana, esto es lo que te conviene
              comer para {perfil.objetivoPeso === 'mantener' ? 'mantener tu peso' : `${perfil.objetivoPeso} de peso`}:
            </Text>
            <ResumenMetas metas={metasNutricion(perfil)} grande />
            <Text style={styles.nota}>
              Proteína: 1,8 g por kg de peso. Grasas: 25 % de las calorías. Carbos: el resto. Lo podés cambiar cuando
              quieras desde tu perfil.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, espacios.m) }]}>
        {paso > 0 && (
          <Pressable onPress={() => setPaso(paso - 1)} style={styles.botonAtras} accessibilityRole="button">
            <Text style={styles.textoAtras}>Atrás</Text>
          </Pressable>
        )}
        <Pressable
          onPress={seguir}
          style={({ pressed }) => [styles.botonSeguir, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoSeguir}>{paso === TOTAL_PASOS - 1 ? 'Empezar' : 'Seguir'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  encabezado: { paddingHorizontal: espacios.m, gap: espacios.s, paddingBottom: espacios.m },
  pasos: { flexDirection: 'row', gap: 6 },
  barraPaso: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colores.pista },
  barraPasoHecha: { backgroundColor: colores.acento },
  numeroPaso: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700', marginTop: espacios.s },
  titulo: { color: colores.texto, fontSize: 30, fontWeight: '800' },
  contenido: { padding: espacios.m, paddingBottom: espacios.xl },
  resultado: { gap: espacios.m },
  texto: { color: colores.texto, fontSize: 16, lineHeight: 23 },
  nota: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  pie: { flexDirection: 'row', gap: espacios.s, paddingHorizontal: espacios.m, paddingTop: espacios.s },
  botonAtras: {
    height: 56,
    paddingHorizontal: espacios.l,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAtras: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  botonSeguir: {
    flex: 1,
    height: 56,
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: { opacity: 0.85 },
  textoSeguir: { color: colores.texto, fontSize: 17, fontWeight: '800' },
});
