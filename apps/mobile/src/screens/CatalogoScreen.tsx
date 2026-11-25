import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

interface CatalogoScreenProps {
  onAbrirEjercicio?: (ejercicio: Ejercicio) => void;
}

export function CatalogoScreen({ onAbrirEjercicio }: CatalogoScreenProps) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [abiertos, setAbiertos] = useState<ReadonlySet<Grupo>>(new Set());

  const grupos = useMemo(
    () => ordenarGruposPorMusculo(agruparPorGrupo(filtrarEjercicios(EJERCICIOS, filtros)), filtros.musculo),
    [filtros],
  );
  // Con un filtro puesto se despliegan todos los grupos para ver los resultados.
  const filtrando = hayFiltrosActivos(filtros);
  const musculoMarcado = useMemo(() => (filtros.musculo ? [filtros.musculo] : []), [filtros.musculo]);

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
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Text style={styles.titulo}>Entreno</Text>

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
                ejercicios.map((e) => (
                  <Pressable
                    key={e.id}
                    onPress={onAbrirEjercicio ? () => onAbrirEjercicio(e) : undefined}
                    disabled={!onAbrirEjercicio}
                    style={({ pressed }) => [styles.itemEjercicio, pressed && styles.presionado]}
                    accessibilityRole="button"
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
                    {onAbrirEjercicio && <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />}
                  </Pressable>
                ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacios.m, paddingBottom: espacios.xl, gap: espacios.m },
  titulo: { color: colores.texto, fontSize: 34, fontWeight: '800' },
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
