import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CampoLugar, CampoNivel, CamposDatos, CamposObjetivos } from '../components/perfil/CamposPerfil';
import { KcalObjetivo } from '../components/perfil/KcalObjetivo';
import { MetaPasos } from '../components/perfil/MetaPasos';
import { ResumenMetas } from '../components/perfil/ResumenMetas';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { usePerfil, usePerfilActual } from '../estado/Perfil';
import { guardarVideosReportados, leerVideosReportados } from '../lib/almacenamiento';
import { formatearFechaCorta, formatearNumero, inicial } from '../lib/formato';
import {
  borradorDe,
  erroresPerfil,
  kcalRecomendadas,
  metasNutricion,
  perfilDesdeBorrador,
  type BorradorPerfil,
  type PerfilUsuario,
} from '../lib/perfil';
import { quitarReporte, reportesRecientes, type VideoReportado } from '../lib/videosReportados';
import { colores, espacios, radios } from '../theme/tema';

const URL_FIXCOMAP = 'https://fixcomap.com';
const VERSION = Constants.expoConfig?.version ?? '';

// Perfil: datos personales, metas, videos reportados, suscripción y pie.
export function PerfilScreen({ onVolver }: { onVolver: () => void }) {
  const insets = useSafeAreaInsets();
  const perfil = usePerfilActual();
  const { guardar } = usePerfil();
  const { config, cambiarMetaPasos } = useDatosDelDia();
  const metas = useMemo(() => metasNutricion(perfil), [perfil]);

  return (
    <KeyboardAvoidingView
      style={[styles.pantalla, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.encabezado}>
        <Pressable
          onPress={onVolver}
          hitSlop={8}
          style={({ pressed }) => [styles.botonVolver, pressed && styles.presionado]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={20} color={colores.texto} />
        </Pressable>
        <Text style={styles.titulo} accessibilityRole="header">
          Perfil
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + espacios.l }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.identidad}>
          <View style={styles.avatar}>
            <Text style={styles.inicial}>{inicial(perfil.nombre)}</Text>
          </View>
          <Text style={styles.nombre}>{perfil.nombre}</Text>
        </View>

        <Seccion titulo="Datos personales">
          {/* key: si se guarda, el formulario arranca de nuevo con lo guardado */}
          <FormularioPerfil key={JSON.stringify(borradorDe(perfil))} perfil={perfil} onGuardar={guardar} />
        </Seccion>

        <Seccion titulo="Metas">
          <ResumenMetas metas={metas} />
          <View style={styles.tarjeta}>
            <KcalObjetivo
              recomendadas={kcalRecomendadas(perfil)}
              personalizadas={perfil.kcalPersonalizadas}
              sexo={perfil.sexo}
              onCambiar={(kcalPersonalizadas) => guardar({ ...perfil, kcalPersonalizadas })}
            />
          </View>
          <View style={styles.tarjeta}>
            <MetaPasos meta={config.metaPasos} onCambiar={cambiarMetaPasos} />
          </View>
        </Seccion>

        <Seccion titulo="Videos reportados">
          <VideosReportados />
        </Seccion>

        <Seccion titulo="Suscripción">
          <View style={[styles.tarjeta, styles.filaPlan]}>
            <Text style={styles.textoPlan}>
              Plan: <Text style={styles.negrita}>{perfil.esPremium ? 'Premium' : 'Gratis'}</Text>
            </Text>
            {!perfil.esPremium && (
              // Todavía sin funcionalidad.
              <Pressable style={styles.botonProbar} accessibilityRole="button">
                <Text style={styles.textoProbar}>Probar 7 días gratis</Text>
              </Pressable>
            )}
          </View>
        </Seccion>

        <View style={styles.pie}>
          <Text style={styles.textoPie}>Fitness app v{VERSION}</Text>
          <Pressable onPress={() => Linking.openURL(URL_FIXCOMAP)} hitSlop={8} accessibilityRole="link">
            <Text style={styles.textoPie}>Hecho por Fixcomap</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

// En Perfil, un perfil de antes puede seguir sin nivel ni lugar (el coach asume los de por defecto).
const VALIDACION = { nivelYLugarOpcionales: true };

// Datos, objetivos, nivel y lugar editables. Al guardar, las metas se recalculan solas (salen del perfil).
function FormularioPerfil({ perfil, onGuardar }: { perfil: PerfilUsuario; onGuardar: (p: PerfilUsuario) => void }) {
  const [borrador, setBorrador] = useState<BorradorPerfil>(() => borradorDe(perfil));
  const [cambiado, setCambiado] = useState(false);
  const errores = erroresPerfil(borrador, VALIDACION);
  const nuevo = perfilDesdeBorrador(
    borrador,
    { esPremium: perfil.esPremium, kcalPersonalizadas: perfil.kcalPersonalizadas },
    VALIDACION,
  );

  const cambiar = (cambios: Partial<BorradorPerfil>) => {
    setBorrador((b) => ({ ...b, ...cambios }));
    setCambiado(true);
  };

  return (
    <View style={[styles.tarjeta, styles.formulario]}>
      <CamposDatos borrador={borrador} errores={errores} onCambiar={cambiar} />
      <CamposObjetivos borrador={borrador} errores={errores} onCambiar={cambiar} />
      <CampoNivel borrador={borrador} errores={errores} onCambiar={cambiar} avisarSinElegir />
      <CampoLugar borrador={borrador} errores={errores} onCambiar={cambiar} avisarSinElegir />
      {cambiado && nuevo && (
        <Text style={styles.ayuda}>
          Con estos datos, el objetivo recomendado pasa a {formatearNumero(kcalRecomendadas(nuevo))} kcal por día
          {nuevo.kcalPersonalizadas !== null &&
            ` (seguís usando tus ${formatearNumero(nuevo.kcalPersonalizadas)} kcal personalizadas)`}
          .
        </Text>
      )}
      <Pressable
        onPress={() => nuevo && onGuardar(nuevo)}
        disabled={!cambiado || !nuevo}
        style={({ pressed }) => [
          styles.botonGuardar,
          (!cambiado || !nuevo) && styles.apagado,
          pressed && styles.presionado,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.textoGuardar}>Guardar cambios</Text>
      </Pressable>
    </View>
  );
}

// Los videos marcados con "¿El video no sirve?", con opción de quitar la marca.
function VideosReportados() {
  const [reportes, setReportes] = useState<readonly VideoReportado[] | null>(null);

  useEffect(() => {
    let vigente = true;
    leerVideosReportados().then((leidos) => {
      if (vigente) setReportes(leidos);
    });
    return () => {
      vigente = false;
    };
  }, []);

  const quitar = async (r: VideoReportado) => {
    // Se lee lo guardado justo antes de escribir, para no pisar otras marcas.
    const nuevos = quitarReporte(await leerVideosReportados(), r.ejercicioId, r.youtubeId);
    setReportes(nuevos);
    await guardarVideosReportados(nuevos).catch(() => {});
  };

  if (reportes === null) return null;
  if (reportes.length === 0) {
    return <Text style={styles.ayuda}>No marcaste ningún video. Si uno no sirve, avisanos desde el ejercicio.</Text>;
  }
  return (
    <View style={styles.tarjeta}>
      {reportesRecientes(reportes).map((r, i) => (
        <View key={`${r.ejercicioId}-${r.youtubeId}`} style={[styles.filaVideo, i > 0 && styles.separador]}>
          <View style={styles.flex}>
            <Text style={styles.nombreVideo}>{buscarEjercicioPorId(r.ejercicioId)?.nombre ?? r.ejercicioId}</Text>
            <Text style={styles.ayuda}>Marcado el {formatearFechaCorta(new Date(r.fecha))}</Text>
          </View>
          <Pressable
            onPress={() => quitar(r)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Quitar la marca de ${buscarEjercicioPorId(r.ejercicioId)?.nombre ?? 'este video'}`}
          >
            <Text style={styles.quitar}>Quitar</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.85 },
  apagado: { opacity: 0.4 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s + 4,
    paddingHorizontal: espacios.m,
    paddingTop: espacios.s,
    paddingBottom: espacios.s,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { color: colores.texto, fontSize: 28, fontWeight: '800' },
  contenido: { padding: espacios.m, gap: espacios.l },
  identidad: { alignItems: 'center', gap: espacios.s },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { color: colores.texto, fontSize: 30, fontWeight: '800' },
  nombre: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  seccion: { gap: espacios.s + 4 },
  tituloSeccion: { color: colores.texto, fontSize: 20, fontWeight: '800' },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.m + 4 },
  formulario: { gap: espacios.l - 4 },
  ayuda: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  botonGuardar: {
    height: 52,
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoGuardar: { color: colores.texto, fontSize: 16, fontWeight: '800' },
  filaVideo: { flexDirection: 'row', alignItems: 'center', gap: espacios.s, paddingVertical: espacios.s + 2 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colores.borde },
  nombreVideo: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  quitar: { color: colores.acento, fontSize: 15, fontWeight: '700' },
  filaPlan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacios.s },
  textoPlan: { color: colores.textoSecundario, fontSize: 16 },
  negrita: { color: colores.texto, fontWeight: '800' },
  botonProbar: {
    paddingHorizontal: espacios.m,
    height: 40,
    borderRadius: radios.pill,
    backgroundColor: colores.oroFondo,
    borderWidth: 1,
    borderColor: colores.oroBorde,
    justifyContent: 'center',
  },
  textoProbar: { color: colores.oro, fontSize: 14, fontWeight: '800' },
  pie: { alignItems: 'center', gap: 4, marginTop: espacios.s },
  textoPie: { color: colores.textoSecundario, fontSize: 12 },
});
