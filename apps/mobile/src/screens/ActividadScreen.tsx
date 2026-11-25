import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoFuenteActividad } from '../components/actividad/AvisoFuenteActividad';
import { GraficoPasos } from '../components/actividad/GraficoPasos';
import { HojaPasosManuales } from '../components/inicio/HojaPasosManuales';
import { BarraProgreso } from '../components/progreso/Barras';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useActividadSemana } from '../hooks/useActividadSemana';
import {
  formatearKm,
  kcalCaminata,
  kmDesdePasos,
  mensajeOms,
  OMS_IDEAL_SEMANA,
  OMS_MINIMO_SEMANA,
  porcentajeOms,
  racha,
} from '../lib/actividad/calculos';
import { diasRestantesDeSemana } from '../lib/fechas';
import { formatearNumero, nombreDia } from '../lib/formato';
import { porcentaje } from '../lib/resumenDia';
import { colores } from '../theme/tema';

export function ActividadScreen() {
  const hoy = new Date();
  const {
    perfil,
    config,
    cambiarMetaPasos,
    cargasDeHoy,
    totalesDeHoy,
    agregarCarga,
    borrar,
    fuente,
    estadoFuente,
    pedirPermiso,
    pasosSensorHoy,
  } = useDatosDelDia();
  const { semana, minutosSemana, pasosParaRacha } = useActividadSemana();
  const [hojaAbierta, setHojaAbierta] = useState(false);

  const meta = config.metaPasos;
  const pasosHoy = pasosSensorHoy + totalesDeHoy.pasos;
  const activa = estadoFuente === 'activa';
  const oms = mensajeOms(minutosSemana, diasRestantesDeSemana(hoy));
  const diasRacha = racha(pasosParaRacha, meta);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        {/* Encabezado con la fuente de los pasos */}
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>Actividad</Text>
          <View style={styles.pastilla} accessibilityLabel={activa ? `Pasos de ${fuente.nombre}` : 'Pasos cargados a mano'}>
            <View style={[styles.punto, { backgroundColor: activa ? colores.verde : colores.textoSecundario }]} />
            <Text style={styles.textoPastilla}>{activa ? fuente.nombre : 'Carga manual'}</Text>
          </View>
        </View>

        <AvisoFuenteActividad estado={estadoFuente} onPermitir={pedirPermiso} />

        {/* Pasos de hoy y de la semana */}
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Hoy, {nombreDia(hoy)}</Text>
          <Text style={styles.numeroGrande}>
            {formatearNumero(pasosHoy)}
            <Text style={styles.sobreMeta}> / {formatearNumero(meta)} pasos</Text>
          </Text>
          <Text style={styles.etiqueta}>≈ {formatearKm(kmDesdePasos(pasosHoy, perfil.alturaCm))} km</Text>
          <View style={styles.barraHoy}>
            <BarraProgreso porcentaje={porcentaje(pasosHoy, meta)} />
          </View>

          <View style={styles.grafico}>
            <GraficoPasos dias={semana.dias} meta={meta} />
          </View>

          <View style={styles.separador} />
          <View style={styles.filaEntre}>
            <Text style={styles.textoSecundario}>Promedio semanal</Text>
            <Text style={styles.negrita}>{formatearNumero(semana.promedio)} pasos/día</Text>
          </View>
        </View>

        {/* Minutos activos vs. OMS */}
        <View style={styles.tarjeta}>
          <View style={styles.filaEntre}>
            <Text style={styles.textoSecundario}>Minutos activos esta semana</Text>
            <Text style={styles.textoSecundario}>lun–dom</Text>
          </View>
          <Text style={styles.numeroGrande}>
            {minutosSemana}
            <Text style={styles.sobreMeta}> min</Text>
          </Text>

          <BarraOms minutos={minutosSemana} />

          <View style={[styles.mensaje, oms.tipo === 'falta' ? styles.mensajeFalta : styles.mensajeBien]}>
            <View style={[styles.iconoMensaje, { backgroundColor: oms.tipo === 'falta' ? colores.acento : colores.verde }]}>
              {oms.tipo === 'falta' ? (
                <Text style={styles.exclamacion}>!</Text>
              ) : (
                <Ionicons name="checkmark" size={18} color={colores.textoSobreAcento} />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={styles.tituloMensaje}>{oms.titulo}</Text>
              <Text style={styles.textoMensaje}>{oms.texto}</Text>
            </View>
          </View>
        </View>

        {/* Calorías por caminar */}
        <View style={styles.tarjeta}>
          <Text style={styles.textoSecundario}>Calorías quemadas hoy</Text>
          <Text style={[styles.numeroGrande, styles.acento]}>
            ≈ {formatearNumero(kcalCaminata(pasosHoy, perfil.alturaCm, perfil.pesoKg))}
            <Text style={styles.sobreMeta}> kcal activas · estimado</Text>
          </Text>
          <Text style={styles.textoSecundario}>Se suman a tu objetivo de calorías en Inicio.</Text>
        </View>

        {/* Racha */}
        <View style={[styles.tarjeta, styles.filaRacha]}>
          <View style={styles.iconoRacha}>
            <Ionicons name="flame" size={22} color={diasRacha > 0 ? colores.acento : colores.textoSecundario} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.valorRacha}>
              {diasRacha} {diasRacha === 1 ? 'día' : 'días'}
            </Text>
            <Text style={styles.textoSecundario}>
              {diasRacha > 0 ? 'seguidos cumpliendo tu meta de pasos' : 'Cumplí tu meta de pasos hoy para empezar una racha'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setHojaAbierta(true)}
          style={({ pressed }) => [styles.botonCargar, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colores.texto} />
          <Text style={styles.textoBoton}>Cargar actividad manual</Text>
        </Pressable>
      </ScrollView>

      <HojaPasosManuales
        visible={hojaAbierta}
        onCerrar={() => setHojaAbierta(false)}
        perfil={perfil}
        cargasDeHoy={cargasDeHoy}
        onAgregar={agregarCarga}
        conPodometro={activa}
        onBorrar={borrar}
        metaPasos={meta}
        onCambiarMeta={cambiarMetaPasos}
      />
    </SafeAreaView>
  );
}

// Barra de 0 a 300 min: hasta 150 pista gris, de 150 a 300 pista verde.
// El relleno es rojo hasta llegar al mínimo y verde desde ahí. Marca blanca en 150.
function BarraOms({ minutos }: { minutos: number }) {
  const p = porcentajeOms(minutos);
  const mitad = (OMS_MINIMO_SEMANA / OMS_IDEAL_SEMANA) * 100;
  const cumplio = minutos >= OMS_MINIMO_SEMANA;
  return (
    <View>
      <View style={styles.barraOms} accessibilityLabel={`${minutos} de ${OMS_IDEAL_SEMANA} minutos`}>
        <View style={[styles.pistaOms, { width: `${mitad}%`, backgroundColor: colores.pista }]} />
        <View style={[styles.pistaOms, { left: `${mitad}%`, width: `${100 - mitad}%`, backgroundColor: colores.verdePista }]} />
        <View style={[styles.rellenoOms, { width: `${p}%`, backgroundColor: cumplio ? colores.verde : colores.acento }]} />
        <View style={[styles.marcaOms, { left: `${mitad}%` }]} />
      </View>
      <View style={styles.escalaOms}>
        <Text style={styles.escala}>0</Text>
        <View style={styles.marcaCentro}>
          <Text style={styles.escalaFuerte}>{OMS_MINIMO_SEMANA}</Text>
          <Text style={styles.escala}>mínimo OMS</Text>
        </View>
        <View style={styles.marcaFin}>
          <Text style={styles.escalaFuerte}>{OMS_IDEAL_SEMANA}</Text>
          <Text style={styles.escala}>ideal</Text>
        </View>
      </View>
    </View>
  );
}

const RADIO_TARJETA = 26;
const ALTO_OMS = 12;

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24, gap: 10 },
  flex: { flex: 1 },
  negrita: { color: colores.texto, fontSize: 14, fontWeight: '800' },
  acento: { color: colores.acento },
  presionado: { opacity: 0.85 },

  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 4 },
  titulo: { color: colores.texto, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colores.tarjeta,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  textoPastilla: { color: colores.texto, fontSize: 13, fontWeight: '800' },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: RADIO_TARJETA, padding: 20, gap: 6 },
  etiqueta: { color: colores.textoSecundario, fontSize: 13 },
  textoSecundario: { color: colores.textoSecundario, fontSize: 13 },
  numeroGrande: { color: colores.texto, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  sobreMeta: { color: colores.textoSecundario, fontSize: 15, fontWeight: '400', letterSpacing: 0 },
  barraHoy: { marginTop: 8 },
  grafico: { marginTop: 18 },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: '#3A3A3A', marginTop: 14, marginBottom: 8 },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  barraOms: { height: ALTO_OMS, marginTop: 14 },
  pistaOms: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: ALTO_OMS / 2 },
  rellenoOms: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: ALTO_OMS / 2 },
  marcaOms: { position: 'absolute', top: -1, bottom: -1, width: 2, marginLeft: -1, backgroundColor: colores.texto },
  escalaOms: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  marcaCentro: { alignItems: 'center' },
  marcaFin: { alignItems: 'flex-end' },
  escala: { color: colores.textoSecundario, fontSize: 11 },
  escalaFuerte: { color: colores.texto, fontSize: 12, fontWeight: '800' },

  mensaje: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, padding: 16, marginTop: 14 },
  mensajeFalta: { backgroundColor: '#3A1B16' },
  mensajeBien: { backgroundColor: colores.verdeFondo },
  iconoMensaje: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  exclamacion: { color: colores.texto, fontSize: 16, fontWeight: '900' },
  tituloMensaje: { color: colores.texto, fontSize: 16, fontWeight: '800' },
  textoMensaje: { color: '#D0D0D0', fontSize: 13, lineHeight: 19, marginTop: 2 },

  filaRacha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconoRacha: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valorRacha: { color: colores.texto, fontSize: 22, fontWeight: '800' },

  botonCargar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colores.acento,
    borderRadius: 999,
    height: 52,
    marginTop: 4,
  },
  textoBoton: { color: colores.texto, fontSize: 15, fontWeight: '800' },
});
