import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { coloresSesion as c, medidasSesion as m } from '../components/entreno/estiloSesion';
import { Miniatura } from '../components/entreno/Miniatura';
import { buscarEjercicioPorId } from '../data/ejercicios';
import { useEntreno } from '../estado/Entreno';
import { textoRango } from '../lib/entreno/rangos';
import {
  DIAS_SEMANA,
  diaDeSemana,
  INICIAL_DIA,
  NOMBRE_DIA,
  rutinaDeDia,
  semanaDe,
  textoDias,
  textoResumenRutina,
  textoSemana,
  type DiaSemana,
  type Rutina,
} from '../lib/entreno/rutinas';

interface RutinasScreenProps {
  onVolver: () => void;
  onEmpezar: (rutina: Rutina) => void;
  onSeguirSesion: () => void;
  onEditar: (rutina: Rutina) => void;
  onNueva: (dia?: DiaSemana) => void;
  onVerHistorial: () => void;
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

// Mis rutinas: la semana (hoy en rojo, un punto en los días con rutina), la tarjeta
// del día elegido y la lista de rutinas.
export function RutinasScreen({
  onVolver,
  onEmpezar,
  onSeguirSesion,
  onEditar,
  onNueva,
  onVerHistorial,
}: RutinasScreenProps) {
  const insets = useSafeAreaInsets();
  const { rutinas, enCurso, asignarDia } = useEntreno();
  const [hoy] = useState(() => new Date());
  const semana = semanaDe(hoy);
  const diaHoy = diaDeSemana(hoy);
  const [elegido, setElegido] = useState<DiaSemana>(diaHoy);
  const [asignando, setAsignando] = useState(false);
  const rutina = rutinaDeDia(rutinas, elegido);

  const fecha = semana[elegido];
  const etiquetaDia =
    elegido === diaHoy
      ? `Hoy, ${NOMBRE_DIA[elegido]} ${fecha.getDate()}`
      : `${mayuscula(NOMBRE_DIA[elegido])} ${fecha.getDate()}`;

  const pedirAsignar = () => (rutinas.length === 0 ? onNueva(elegido) : setAsignando(true));

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Encabezado */}
        <View style={styles.encabezado}>
          <Pressable
            onPress={onVolver}
            hitSlop={8}
            style={({ pressed }) => [styles.botonRedondo, pressed && styles.presionado]}
            accessibilityRole="button"
            accessibilityLabel="Volver a Entreno"
          >
            <Ionicons name="chevron-back" size={20} color={c.blanco} />
          </Pressable>
          <Text style={styles.titulo} accessibilityRole="header">
            Mis rutinas
          </Text>
          <Text style={styles.rangoSemana}>{textoSemana(semana)}</Text>
        </View>

        {/* Semana */}
        <View style={styles.semana} accessibilityRole="tablist">
          {DIAS_SEMANA.map((d) => {
            const esHoy = d === diaHoy;
            const esElegido = d === elegido;
            const conRutina = rutinaDeDia(rutinas, d) !== null;
            return (
              <Pressable
                key={d}
                onPress={() => setElegido(d)}
                style={[styles.anilloDia, esElegido && (esHoy ? styles.anilloHoy : styles.anilloElegido)]}
                accessibilityRole="tab"
                accessibilityState={{ selected: esElegido }}
                accessibilityLabel={`${mayuscula(NOMBRE_DIA[d])} ${semana[d].getDate()}${esHoy ? ', hoy' : ''}${conRutina ? ', con rutina' : ''}`}
              >
                <View style={[styles.dia, esHoy && styles.diaHoy]}>
                  <Text style={[styles.letraDia, esHoy && styles.letraDiaHoy]}>{INICIAL_DIA[d]}</Text>
                  <Text style={styles.numeroDia}>{semana[d].getDate()}</Text>
                  <View style={[styles.punto, conRutina && (esHoy ? styles.puntoBlanco : styles.puntoRojo)]} />
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* El día elegido */}
        <View style={styles.tarjetaDia}>
          <Text style={styles.etiqueta}>{etiquetaDia}</Text>
          {rutina ? (
            <>
              <Text style={styles.nombreRutina}>{rutina.nombre}</Text>
              <Text style={styles.etiqueta}>{textoResumenRutina(rutina)}</Text>
              <View style={styles.lista}>
                {rutina.ejercicios.map((e, i) => {
                  const datos = buscarEjercicioPorId(e.ejercicioId);
                  return (
                    <View key={e.ejercicioId} style={[styles.filaEjercicio, i > 0 && styles.separador]}>
                      {datos && <Miniatura ejercicio={datos} tamano={46} radio={12} />}
                      <Text style={styles.nombreEjercicio} numberOfLines={2}>
                        {datos?.nombre ?? 'Ejercicio'}
                      </Text>
                      <Text style={styles.objetivo}>
                        {e.series}×{textoRango(e.rango)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Pressable
                onPress={enCurso ? onSeguirSesion : () => onEmpezar(rutina)}
                style={({ pressed }) => [styles.botonEmpezar, pressed && styles.presionado]}
                accessibilityRole="button"
              >
                <Text style={styles.textoEmpezar}>{enCurso ? 'Seguir la sesión en curso' : 'Empezar'}</Text>
                <Ionicons name="play" size={18} color={c.blanco} />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.nombreRutina}>Día de descanso</Text>
              <Text style={styles.etiqueta}>No hay una rutina para este día.</Text>
              <Pressable
                onPress={pedirAsignar}
                style={({ pressed }) => [styles.botonAsignar, pressed && styles.presionado]}
                accessibilityRole="button"
              >
                <Text style={styles.textoAsignar}>+ Asignar rutina</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Tus rutinas */}
        <View style={styles.cabeceraLista}>
          <Text style={styles.subtitulo} accessibilityRole="header">
            Tus rutinas
          </Text>
          {rutinas.length > 0 && (
            <Text style={styles.etiqueta}>
              {rutinas.length} {rutinas.length === 1 ? 'plantilla' : 'plantillas'}
            </Text>
          )}
        </View>

        {rutinas.length === 0 && (
          <Text style={styles.vacio}>Todavía no tenés rutinas. Armá una y elegí qué días la hacés.</Text>
        )}

        {rutinas.map((r) => (
          <View key={r.id} style={[styles.tarjetaRutina, r.dias.includes(diaHoy) && styles.tarjetaDeHoy]}>
            <View style={styles.flex}>
              <Text style={styles.nombreTarjeta}>{r.nombre}</Text>
              <Text style={styles.etiqueta}>{textoResumenRutina(r)}</Text>
              <View style={styles.chips} accessibilityLabel={textoDias(r.dias)}>
                {DIAS_SEMANA.map((d) => {
                  const marcado = r.dias.includes(d);
                  return (
                    <View key={d} style={[styles.chip, marcado && styles.chipMarcado]}>
                      <Text style={[styles.letraChip, marcado && styles.letraChipMarcada]}>{INICIAL_DIA[d]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <Pressable
              onPress={() => onEditar(r)}
              style={({ pressed }) => [styles.botonEditar, pressed && styles.presionado]}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${r.nombre}`}
            >
              <Text style={styles.textoEditar}>Editar</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => onNueva()}
          style={({ pressed }) => [styles.botonNueva, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoNueva}>+ Nueva rutina</Text>
        </Pressable>

        <Pressable
          onPress={onVerHistorial}
          style={({ pressed }) => [styles.filaHistorial, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Ionicons name="time-outline" size={20} color={c.textoTenue} />
          <Text style={styles.textoHistorial}>Ver historial de sesiones</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textoTenue} />
        </Pressable>
      </ScrollView>

      {/* Elegir qué rutina se hace el día elegido */}
      <Modal visible={asignando} transparent animationType="fade" onRequestClose={() => setAsignando(false)}>
        <Pressable style={styles.fondoHoja} onPress={() => setAsignando(false)} accessibilityLabel="Cerrar" />
        <View style={[styles.hoja, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.tituloHoja}>¿Qué rutina hacés el {NOMBRE_DIA[elegido]}?</Text>
          {rutinas.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => {
                asignarDia(r.id, elegido);
                setAsignando(false);
              }}
              style={({ pressed }) => [styles.opcion, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <View style={styles.flex}>
                <Text style={styles.nombreOpcion}>{r.nombre}</Text>
                <Text style={styles.etiqueta}>{textoDias(r.dias)}</Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={c.blanco} />
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              setAsignando(false);
              onNueva(elegido);
            }}
            style={({ pressed }) => [styles.botonNueva, pressed && styles.presionado]}
            accessibilityRole="button"
          >
            <Text style={styles.textoNueva}>+ Nueva rutina para el {NOMBRE_DIA[elegido]}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: c.fondo },
  contenido: { paddingHorizontal: m.margen, paddingBottom: 32, gap: 14 },
  flex: { flex: 1 },
  presionado: { opacity: 0.8 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 4 },
  botonRedondo: {
    width: m.botonRedondo,
    height: m.botonRedondo,
    borderRadius: m.botonRedondo / 2,
    backgroundColor: c.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { flex: 1, color: c.blanco, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  rangoSemana: { color: c.textoTenue, fontSize: 14 },

  semana: { flexDirection: 'row', gap: 4 },
  // Anillo alrededor del día elegido (rojo si es hoy).
  anilloDia: { flex: 1, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  anilloHoy: { borderColor: c.rojo },
  anilloElegido: { borderColor: c.blanco },
  dia: {
    height: 76,
    borderRadius: 14,
    backgroundColor: c.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  diaHoy: { backgroundColor: c.rojo },
  letraDia: { color: c.textoTenue, fontSize: 11, fontWeight: '800' },
  letraDiaHoy: { color: c.blanco },
  numeroDia: { color: c.blanco, fontSize: 20, fontWeight: '900' },
  punto: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  puntoRojo: { backgroundColor: c.rojo },
  puntoBlanco: { backgroundColor: c.blanco },

  tarjetaDia: { backgroundColor: c.superficie, borderRadius: 24, padding: 20, gap: 4 },
  etiqueta: { color: c.textoTenue, fontSize: 14 },
  nombreRutina: { color: c.blanco, fontSize: 24, fontWeight: '900', letterSpacing: -0.3, marginTop: 2 },
  lista: { marginTop: 10 },
  filaEjercicio: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11 },
  separador: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.pistaAnillo },
  nombreEjercicio: { flex: 1, color: c.blanco, fontSize: 16, fontWeight: '800' },
  objetivo: { color: c.blanco, fontSize: 16, fontWeight: '900' },
  botonEmpezar: {
    marginTop: 14,
    height: 62,
    borderRadius: 31,
    backgroundColor: c.rojo,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  textoEmpezar: { color: c.blanco, fontSize: 19, fontWeight: '900' },
  botonAsignar: {
    marginTop: 14,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.pista,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAsignar: { color: c.blanco, fontSize: 17, fontWeight: '800' },

  cabeceraLista: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14 },
  subtitulo: { color: c.blanco, fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  vacio: { color: c.textoTenue, fontSize: 15, lineHeight: 21 },
  tarjetaRutina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.superficie,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: 20,
  },
  tarjetaDeHoy: { borderColor: c.bordeDestacado },
  nombreTarjeta: { color: c.blanco, fontSize: 19, fontWeight: '900' },
  chips: { flexDirection: 'row', gap: 6, marginTop: 12 },
  chip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.diaApagado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipMarcado: { backgroundColor: c.rojo },
  letraChip: { color: c.letraApagada, fontSize: 11, fontWeight: '800' },
  letraChipMarcada: { color: c.blanco },
  botonEditar: { backgroundColor: c.pista, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 13 },
  textoEditar: { color: c.blanco, fontSize: 16, fontWeight: '800' },
  botonNueva: {
    height: 60,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: c.bordeDiscontinuo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNueva: { color: c.textoBoton, fontSize: 17, fontWeight: '800' },
  filaHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    height: 56,
    borderRadius: 18,
    backgroundColor: c.superficie,
  },
  textoHistorial: { flex: 1, color: c.blanco, fontSize: 16, fontWeight: '700' },

  fondoHoja: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  hoja: {
    backgroundColor: c.fondo,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: m.margen,
    paddingTop: 22,
    gap: 10,
  },
  tituloHoja: { color: c.blanco, fontSize: 20, fontWeight: '900', marginBottom: 4 },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.superficie,
    borderRadius: 18,
    padding: 16,
  },
  nombreOpcion: { color: c.blanco, fontSize: 17, fontWeight: '800' },
});
