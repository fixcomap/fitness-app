import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaCoach } from '../components/inicio/TarjetaCoach';
import { AnilloProgreso } from '../components/progreso/AnilloProgreso';
import { BarraProgreso, BarraSegmentada } from '../components/progreso/Barras';
import { CONFIGURACION_POR_DEFECTO } from '../lib/configuracion';
import { formatearFechaCorta, formatearNumero, inicial } from '../lib/formato';
import { PERFIL_EJEMPLO } from '../lib/perfil';
import {
  kcalRestantes,
  pasosTotales,
  porcentaje,
  porcentajeKcal,
  resumenDeEjemplo,
  type Meta,
  type ResumenDia,
} from '../lib/resumenDia';
import { colores } from '../theme/tema';

// Consejo de ejemplo hasta que el coach genere los suyos.
const CONSEJO_EJEMPLO = 'Ayer te faltaron 40 g de proteína. Sumá un yogur griego en la merienda y llegás.';

// En el diseño cada macro tiene su gris: de más claro a más oscuro.
const COLOR_MACRO = { proteinas: '#F2F2F2', carbos: '#BDBDBD', grasas: '#8A8A8A' } as const;

interface InicioScreenProps {
  onEmpezarEntreno: () => void;
  onAbrirCoach: () => void;
  resumen?: ResumenDia;
  hoy?: Date;
}

export function InicioScreen({ onEmpezarEntreno, onAbrirCoach, resumen: resumenProp, hoy = new Date() }: InicioScreenProps) {
  const perfil = PERFIL_EJEMPLO;
  const resumen = useMemo(
    () => resumenProp ?? resumenDeEjemplo(CONFIGURACION_POR_DEFECTO.metaPasos),
    [resumenProp],
  );
  const { kcal, macros, pasos, minutosActivos, entreno } = resumen;
  const totalPasos = pasosTotales(pasos);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        {/* Saludo */}
        <View style={styles.saludo}>
          <View>
            <Text style={styles.fecha}>{formatearFechaCorta(hoy)}</Text>
            <Text style={styles.hola}>Hola, {perfil.nombre}</Text>
          </View>
          <View style={styles.avatar} accessibilityLabel={`Perfil de ${perfil.nombre}`}>
            <Text style={styles.inicial}>{inicial(perfil.nombre)}</Text>
          </View>
        </View>

        {/* Calorías y macros */}
        <View style={[styles.tarjeta, styles.tarjetaKcal]}>
          <View style={styles.centrado}>
            <AnilloProgreso porcentaje={porcentajeKcal(kcal)} tamano={146} grosor={12}>
              <Text style={styles.kcalNumero}>{formatearNumero(kcalRestantes(kcal))}</Text>
              <Text style={styles.kcalTexto}>kcal restantes</Text>
            </AnilloProgreso>
          </View>

          <View style={styles.cuenta}>
            <Termino valor={kcal.objetivo} etiqueta="Objetivo" />
            <Text style={styles.operador}>+</Text>
            <Termino valor={kcal.actividad} etiqueta="Actividad" destacado alineacion="center" />
            <Text style={styles.operador}>−</Text>
            <Termino valor={kcal.comidas} etiqueta="Comiste" alineacion="flex-end" />
          </View>

          <View style={styles.separador} />

          <View style={styles.macros}>
            <Macro nombre="Proteínas" valor={macros.proteinas} color={COLOR_MACRO.proteinas} />
            <Macro nombre="Carbos" valor={macros.carbos} color={COLOR_MACRO.carbos} />
            <Macro nombre="Grasas" valor={macros.grasas} color={COLOR_MACRO.grasas} />
          </View>
        </View>

        {/* Pasos y minutos activos */}
        <View style={styles.filaTarjetas}>
          <View style={[styles.tarjeta, styles.tarjetaChica]}>
            <Text style={styles.etiqueta}>Pasos</Text>
            <ValorSobreMeta valor={totalPasos} meta={formatearNumero(pasos.meta)} />
            <BarraSegmentada porcentaje={porcentaje(totalPasos, pasos.meta)} />
            <Text style={styles.etiqueta}>hoy</Text>
          </View>
          <View style={[styles.tarjeta, styles.tarjetaChica]}>
            <Text style={styles.etiqueta}>Minutos activos</Text>
            <ValorSobreMeta valor={minutosActivos.semana} meta={`${minutosActivos.metaSemana} min`} />
            <BarraProgreso porcentaje={porcentaje(minutosActivos.semana, minutosActivos.metaSemana)} />
            <Text style={styles.etiqueta}>hoy: {minutosActivos.hoy} min</Text>
          </View>
        </View>

        {/* Entreno de hoy */}
        {entreno && (
          <View style={styles.entreno}>
            <View style={styles.flex}>
              <Text style={styles.entrenoEtiqueta}>Entreno de hoy · {entreno.duracionMin} min</Text>
              <Text style={styles.entrenoNombre}>{entreno.nombre}</Text>
            </View>
            <Pressable
              onPress={onEmpezarEntreno}
              style={({ pressed }) => [styles.botonEmpezar, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Text style={styles.textoEmpezar}>Empezar</Text>
              <Ionicons name="play" size={14} color={colores.textoSobreAcento} />
            </Pressable>
          </View>
        )}

        {/* Coach */}
        <TarjetaCoach
          esPremium={perfil.esPremium}
          consejo={CONSEJO_EJEMPLO}
          onResponder={onAbrirCoach}
          onProbarGratis={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Termino({
  valor,
  etiqueta,
  destacado = false,
  alineacion = 'flex-start',
}: {
  valor: number;
  etiqueta: string;
  destacado?: boolean;
  alineacion?: 'flex-start' | 'center' | 'flex-end';
}) {
  return (
    <View style={{ alignItems: alineacion }}>
      <Text style={[styles.terminoValor, destacado && styles.textoAcento]}>{formatearNumero(valor)}</Text>
      <Text style={styles.terminoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

function Macro({ nombre, valor, color }: { nombre: string; valor: Meta; color: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.etiqueta}>{nombre}</Text>
      <Text style={styles.macroValor}>
        <Text style={styles.negrita}>{formatearNumero(valor.actual)}</Text> / {formatearNumero(valor.meta)} g
      </Text>
      <BarraProgreso porcentaje={porcentaje(valor.actual, valor.meta)} color={color} />
    </View>
  );
}

function ValorSobreMeta({ valor, meta }: { valor: number; meta: string }) {
  return (
    <Text style={styles.valorGrande}>
      {formatearNumero(valor)}
      <Text style={styles.valorMeta}> / {meta}</Text>
    </Text>
  );
}

const RADIO_TARJETA = 26;

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 },
  flex: { flex: 1 },
  centrado: { alignItems: 'center' },
  negrita: { fontWeight: '800' },
  presionado: { opacity: 0.85 },
  textoAcento: { color: colores.acento },

  saludo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  fecha: { color: colores.textoSecundario, fontSize: 13 },
  hola: { color: colores.texto, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { color: colores.texto, fontSize: 15, fontWeight: '800' },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: RADIO_TARJETA },
  tarjetaKcal: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  kcalNumero: { color: colores.texto, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  kcalTexto: { color: colores.textoSecundario, fontSize: 12 },

  cuenta: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 18 },
  operador: { color: colores.textoSecundario, fontSize: 18, fontWeight: '600', marginTop: 2 },
  terminoValor: { color: colores.texto, fontSize: 19, fontWeight: '800' },
  terminoEtiqueta: { color: colores.textoSecundario, fontSize: 11, marginTop: 2 },

  separador: { height: StyleSheet.hairlineWidth, backgroundColor: '#3A3A3A', marginVertical: 14 },

  macros: { flexDirection: 'row', gap: 14 },
  macro: { flex: 1, gap: 6 },
  macroValor: { color: colores.texto, fontSize: 13 },
  etiqueta: { color: colores.textoSecundario, fontSize: 12 },

  filaTarjetas: { flexDirection: 'row', gap: 10 },
  tarjetaChica: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, gap: 10 },
  valorGrande: { color: colores.texto, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  valorMeta: { color: colores.textoSecundario, fontSize: 12, fontWeight: '400', letterSpacing: 0 },

  entreno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.acento,
    borderRadius: RADIO_TARJETA,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  entrenoEtiqueta: { color: colores.texto, fontSize: 12, fontWeight: '700' },
  entrenoNombre: { color: colores.texto, fontSize: 19, fontWeight: '800', lineHeight: 23, marginTop: 2 },
  botonEmpezar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colores.texto,
    borderRadius: 999,
    paddingHorizontal: 18,
    height: 44,
  },
  textoEmpezar: { color: colores.textoSobreAcento, fontSize: 15, fontWeight: '800' },
});
