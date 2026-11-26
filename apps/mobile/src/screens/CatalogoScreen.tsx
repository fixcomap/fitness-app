import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '../components/Chip';
import { MapaMuscular } from '../components/MapaMuscular';
import { EJERCICIOS } from '../data/ejercicios';
import { NOMBRE_EQUIPO, NOMBRE_GRUPO, NOMBRE_MUSCULO } from '../data/nombres';
import { EQUIPOS, type Ejercicio, type Grupo, type Musculo } from '../data/tipos';
import {
  agruparPorGrupo,
  filtrarEjercicios,
  FILTROS_VACIOS,
  hayFiltrosActivos,
  ordenarGruposPorMusculo,
  trabajaComoSecundario,
  type FiltroEquipo,
  type Filtros,
} from '../lib/filtrosEjercicios';
import { colores, espacios, radios } from '../theme/tema';

const OPCIONES_EQUIPO: FiltroEquipo[] = ['todos', ...EQUIPOS];

// Modo selección (desde el editor de rutinas): se tildan ejercicios y se agregan juntos.
export interface SeleccionCatalogo {
  elegidos: ReadonlySet<string>;
  yaAgregados: ReadonlySet<string>; // los que ya están en la rutina (no se pueden elegir)
  onAlternar: (ejercicio: Ejercicio) => void;
  onCancelar: () => void;
  onListo: () => void;
}

interface CatalogoScreenProps {
  onAbrirEjercicio?: (ejercicio: Ejercicio) => void;
  onAbrirRutinas?: () => void;
  // Estado de la sesión de hoy, para la barra de abajo.
  sesion?: { ejercicios: number; enCurso: boolean };
  onAbrirSesion?: () => void;
  seleccion?: SeleccionCatalogo;
}

export function CatalogoScreen({
  onAbrirEjercicio,
  onAbrirRutinas,
  sesion,
  onAbrirSesion,
  seleccion,
}: CatalogoScreenProps) {
  const insets = useSafeAreaInsets();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [abiertos, setAbiertos] = useState<ReadonlySet<Grupo>>(new Set());

  const grupos = useMemo(
    () => ordenarGruposPorMusculo(agruparPorGrupo(filtrarEjercicios(EJERCICIOS, filtros)), filtros.musculo),
    [filtros],
  );
  // Con un filtro puesto se despliegan todos los grupos para ver los resultados.
  const filtrando = hayFiltrosActivos(filtros);
  const musculoMarcado = useMemo(() => (filtros.musculo ? [filtros.musculo] : []), [filtros.musculo]);

  const mostrarBarra = !seleccion && !!sesion && !!onAbrirSesion && (sesion.enCurso || sesion.ejercicios > 0);

  const cambiar = (cambios: Partial<Filtros>) => setFiltros((f) => ({ ...f, ...cambios }));

  const alternarMusculo = (musculo: Musculo) =>
    setFiltros((f) => ({ ...f, musculo: f.musculo === musculo ? null : musculo }));

  const alternarGrupo = (grupo: Grupo) =>
    setAbiertos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(grupo)) nuevo.delete(grupo);
      else nuevo.add(grupo);
      return nuevo;
    });

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.contenido, (mostrarBarra || seleccion) && styles.contenidoConBarra]}
        keyboardShouldPersistTaps="handled"
      >
        {seleccion ? (
          <View style={styles.encabezado}>
            <Pressable onPress={seleccion.onCancelar} hitSlop={8} accessibilityRole="button">
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </Pressable>
            <Text style={styles.tituloSeleccion} accessibilityRole="header">
              Agregar ejercicios
            </Text>
            {/* Mismo ancho que "Cancelar", para centrar el título. */}
            <Text style={[styles.textoCancelar, styles.invisible]}>Cancelar</Text>
          </View>
        ) : (
          <View style={styles.encabezado}>
            <Text style={styles.titulo}>Entreno</Text>
            {onAbrirRutinas && (
              <Pressable
                onPress={onAbrirRutinas}
                style={({ pressed }) => [styles.botonRutinas, pressed && styles.presionado]}
                accessibilityRole="button"
              >
                <Ionicons name="calendar-outline" size={16} color={colores.texto} />
                <Text style={styles.textoRutinas}>Mis rutinas</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.buscador}>
          <Ionicons name="search" size={18} color={colores.textoSecundario} />
          <TextInput
            value={filtros.texto}
            onChangeText={(texto) => cambiar({ texto })}
            placeholder="Buscar ejercicio o músculo"
            placeholderTextColor={colores.textoSecundario}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar ejercicio"
          />
          {filtros.texto !== '' && (
            <Pressable onPress={() => cambiar({ texto: '' })} accessibilityLabel="Borrar búsqueda" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colores.textoSecundario} />
            </Pressable>
          )}
        </View>

        <View style={styles.tarjetaMapa}>
          <MapaMuscular escala={0.6} musculosPrincipales={musculoMarcado} onMusculoPress={alternarMusculo} />
          <Text style={styles.ayuda}>Tocá un músculo para filtrar</Text>
        </View>

        {filtros.musculo && (
          <View style={styles.fila}>
            <Chip
              texto={`Músculo: ${NOMBRE_MUSCULO[filtros.musculo]} ✕`}
              activo
              onPress={() => cambiar({ musculo: null })}
              accessibilityLabel={`Quitar filtro de músculo ${NOMBRE_MUSCULO[filtros.musculo]}`}
            />
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filaChips}
          contentContainerStyle={styles.chips}
        >
          {OPCIONES_EQUIPO.map((equipo) => (
            <Chip
              key={equipo}
              texto={equipo === 'todos' ? 'Todos' : NOMBRE_EQUIPO[equipo]}
              activo={filtros.equipo === equipo}
              onPress={() => cambiar({ equipo })}
            />
          ))}
        </ScrollView>

        {grupos.length === 0 && <Text style={styles.vacio}>No hay ejercicios con esos filtros.</Text>}

        {grupos.map(({ grupo, ejercicios }) => {
          const abierto = filtrando || abiertos.has(grupo);
          return (
            <View key={grupo} style={styles.tarjeta}>
              <Pressable
                onPress={() => alternarGrupo(grupo)}
                style={styles.cabeceraGrupo}
                accessibilityRole="button"
                accessibilityState={{ expanded: abierto }}
              >
                <Text style={styles.nombreGrupo}>{NOMBRE_GRUPO[grupo]}</Text>
                <View style={styles.fila}>
                  <Text style={styles.cantidad}>{ejercicios.length}</Text>
                  <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={20} color={colores.textoSecundario} />
                </View>
              </Pressable>

              {abierto &&
                ejercicios.map((e) => {
                  const yaEsta = seleccion?.yaAgregados.has(e.id) ?? false;
                  const elegido = seleccion?.elegidos.has(e.id) ?? false;
                  const alTocar = seleccion
                    ? () => seleccion.onAlternar(e)
                    : onAbrirEjercicio
                      ? () => onAbrirEjercicio(e)
                      : undefined;
                  return (
                    <Pressable
                      key={e.id}
                      onPress={alTocar}
                      disabled={!alTocar || yaEsta}
                      style={({ pressed }) => [
                        styles.itemEjercicio,
                        pressed && styles.presionado,
                        yaEsta && styles.yaAgregado,
                      ]}
                      accessibilityRole={seleccion ? 'checkbox' : 'button'}
                      accessibilityState={seleccion ? { checked: elegido || yaEsta, disabled: yaEsta } : undefined}
                    >
                      <View style={styles.flex}>
                        <Text style={styles.nombreEjercicio}>{e.nombre}</Text>
                        <View style={styles.fila}>
                          <Text style={styles.detalleEjercicio}>
                            {NOMBRE_EQUIPO[e.equipo]} · {NOMBRE_MUSCULO[e.musculoPrincipal]}
                          </Text>
                          {filtros.musculo && trabajaComoSecundario(e, filtros.musculo) && (
                            <Text style={styles.etiquetaSecundario}>también trabaja</Text>
                          )}
                        </View>
                      </View>
                      {seleccion ? (
                        yaEsta ? (
                          <Text style={styles.detalleEjercicio}>Ya está</Text>
                        ) : (
                          <Ionicons
                            name={elegido ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24}
                            color={elegido ? colores.acento : colores.textoSecundario}
                          />
                        )
                      ) : (
                        onAbrirEjercicio && (
                          <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
                        )
                      )}
                    </Pressable>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      {/* Barra fija con la sesión de hoy */}
      {mostrarBarra && sesion && (
        <Pressable
          onPress={onAbrirSesion}
          style={({ pressed }) => [styles.barraSesion, pressed && styles.barraPresionada]}
          accessibilityRole="button"
        >
          <Ionicons name={sesion.enCurso ? 'timer-outline' : 'barbell-outline'} size={20} color={colores.texto} />
          <Text style={styles.textoBarra}>
            {sesion.enCurso
              ? 'Sesión en curso'
              : `Sesión: ${sesion.ejercicios} ${sesion.ejercicios === 1 ? 'ejercicio' : 'ejercicios'}`}
          </Text>
          <Text style={styles.accionBarra}>{sesion.enCurso ? 'Volver' : 'Empezar'}</Text>
          <Ionicons name="chevron-forward" size={18} color={colores.texto} />
        </Pressable>
      )}

      {/* Modo selección: agregar los elegidos */}
      {seleccion && (
        <Pressable
          onPress={seleccion.onListo}
          disabled={seleccion.elegidos.size === 0}
          style={({ pressed }) => [
            styles.barraSesion,
            styles.barraAgregar,
            { bottom: Math.max(insets.bottom, espacios.s + 4) },
            seleccion.elegidos.size === 0 && styles.barraApagada,
            pressed && styles.barraPresionada,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.textoAgregar}>
            {seleccion.elegidos.size === 0
              ? 'Elegí ejercicios'
              : `Agregar ${seleccion.elegidos.size} ${seleccion.elegidos.size === 1 ? 'ejercicio' : 'ejercicios'}`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.m, paddingBottom: espacios.xl, gap: espacios.m },
  contenidoConBarra: { paddingBottom: 96 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { color: colores.texto, fontSize: 34, fontWeight: '800' },
  botonRutinas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  textoRutinas: { color: colores.texto, fontSize: 14, fontWeight: '700' },
  textoCancelar: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  invisible: { opacity: 0 },
  tituloSeleccion: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  barraAgregar: { justifyContent: 'center', paddingVertical: 18, borderRadius: radios.pill },
  barraApagada: { backgroundColor: colores.tarjetaElevada },
  textoAgregar: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  yaAgregado: { opacity: 0.5 },
  barraSesion: {
    position: 'absolute',
    left: espacios.m,
    right: espacios.m,
    bottom: espacios.s + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    backgroundColor: colores.acento,
    borderRadius: radios.medio,
    paddingHorizontal: espacios.m,
    paddingVertical: 14,
  },
  barraPresionada: { opacity: 0.9 },
  textoBarra: { flex: 1, color: colores.texto, fontSize: 15, fontWeight: '700' },
  accionBarra: { color: colores.texto, fontSize: 15, fontWeight: '800' },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacios.s,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.medio,
    paddingHorizontal: espacios.m,
  },
  input: { flex: 1, color: colores.texto, fontSize: 16, paddingVertical: 12 },
  tarjetaMapa: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    paddingVertical: espacios.m,
    alignItems: 'center',
  },
  ayuda: { color: colores.textoSecundario, fontSize: 13, marginTop: espacios.s },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacios.s },
  // Sale del padding de la pantalla para que los chips se deslicen hasta el borde.
  filaChips: { marginHorizontal: -espacios.m },
  chips: { gap: espacios.s, paddingHorizontal: espacios.m },
  vacio: { color: colores.textoSecundario, textAlign: 'center', marginTop: espacios.l },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, overflow: 'hidden' },
  cabeceraGrupo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacios.m,
    paddingVertical: 18,
  },
  nombreGrupo: { color: colores.texto, fontSize: 20, fontWeight: '800' },
  cantidad: { color: colores.acento, fontSize: 18, fontWeight: '800' },
  itemEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacios.m,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  presionado: { backgroundColor: colores.tarjetaElevada },
  flex: { flex: 1 },
  nombreEjercicio: { color: colores.texto, fontSize: 16, fontWeight: '600' },
  detalleEjercicio: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  etiquetaSecundario: {
    color: colores.acentoSuave,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radios.pill,
    borderWidth: 1,
    borderColor: colores.acentoSuave,
    overflow: 'hidden',
  },
});
