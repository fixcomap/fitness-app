import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoLugar, CampoNivel, CamposDatos, CamposObjetivos } from '../components/perfil/CamposPerfil';
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

// Los campos que se validan en cada paso (el último es el resultado).
const CAMPOS_PASO: readonly (readonly CampoPerfil[])[] = [
  ['nombre', 'sexo', 'edad', 'alturaCm', 'pesoKg'],
  ['objetivoPeso', 'objetivo', 'diasEntrenoPorSemana'],
  ['nivel'],
  ['lugar'],
];
const TITULOS = ['Contanos de vos', 'Tus objetivos', 'Tu nivel', 'Dónde entrenás', 'Tu plan'];
const TOTAL_PASOS = TITULOS.length;
const PASO_PLAN = TOTAL_PASOS - 1;

// La primera vez: datos, objetivos, nivel, dónde entrena (una pregunta por pantalla) y el resultado
// con las kcal calculadas. onCancelar: solo al repetirla desde Perfil (en desarrollo), para salir sin guardar.
export function OnboardingScreen({
  onListo,
  onCancelar,
}: {
  onListo: (perfil: PerfilUsuario) => void;
  onCancelar?: () => void;
}) {
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
        <View style={styles.filaPaso}>
          <Text style={styles.numeroPaso}>
            Paso {paso + 1} de {TOTAL_PASOS}
          </Text>
          {onCancelar && (
            <Pressable onPress={onCancelar} hitSlop={8} accessibilityRole="button">
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.titulo} accessibilityRole="header">
          {TITULOS[paso]}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        {paso === 0 && <CamposDatos borrador={borrador} errores={intentado ? erroresPaso : {}} onCambiar={cambiar} />}
        {paso === 1 && (
          <CamposObjetivos borrador={borrador} errores={intentado ? erroresPaso : {}} onCambiar={cambiar} />
        )}
        {paso === 2 && <CampoNivel borrador={borrador} errores={intentado ? erroresPaso : {}} onCambiar={cambiar} />}
        {paso === 3 && <CampoLugar borrador={borrador} errores={intentado ? erroresPaso : {}} onCambiar={cambiar} />}
        {paso === PASO_PLAN && perfil && (
          <View style={styles.resultado}>
            <Text style={styles.texto}>
              {perfil.nombre}, esto es lo que te conviene comer en un día sin entrenar para{' '}
              {perfil.objetivoPeso === 'mantener' ? 'mantener tu peso' : `${perfil.objetivoPeso} de peso`}. Lo que
              gastes caminando y entrenando se suma aparte cada día.
            </Text>
            <ResumenMetas metas={metasNutricion(perfil)} grande />
            <Text style={styles.nota}>
              Proteína: 1,8 g por kg de peso. Grasas: 25 % de las calorías. Carbos: el resto. Si preferís otro número de
              kcal, lo podés personalizar desde tu perfil.
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
          <Text style={styles.textoSeguir}>{paso === PASO_PLAN ? 'Empezar' : 'Seguir'}</Text>
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
  filaPaso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espacios.s,
  },
  numeroPaso: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  textoCancelar: { color: colores.textoSecundario, fontSize: 15, fontWeight: '700' },
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
