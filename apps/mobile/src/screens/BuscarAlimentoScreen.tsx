import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaPorcion } from '../components/comida/HojaPorcion';
import { useComidas } from '../estado/Comidas';
import { buscarCaseras, normalizar, subtituloAlimento, type Alimento } from '../lib/comida/alimentos';
import { pedirBusqueda } from '../lib/comida/clienteOff';
import { alimentosRecientes, NOMBRE_COMIDA, textoAgregarA, type Comida } from '../lib/comida/diario';
import { buscarGuardados, combinarResultados, esErrorLimite } from '../lib/comida/openFoodFacts';
import { cantidadInicial, type Cantidad } from '../lib/comida/porciones';
import { colores, radios } from '../theme/tema';

// Se busca en Open Food Facts después de dejar de escribir un rato, y desde 3 letras.
const ESPERA_BUSQUEDA_MS = 400;
const MINIMO_LETRAS = 3;

type EstadoEnvasados =
  | { tipo: 'nada' }
  | { tipo: 'buscando'; consulta: string }
  | { tipo: 'listo'; consulta: string; argentina: Alimento[]; mundo: Alimento[] }
  | { tipo: 'sin-conexion'; consulta: string }
  | { tipo: 'limite'; consulta: string }; // Open Food Facts cortó por muchos pedidos

interface BuscarAlimentoScreenProps {
  dia: string;
  comida: Comida;
  onVolver: () => void;
  onEscanear: () => void;
  onCrear: (nombre: string) => void; // crear un alimento propio
}

// Buscador: los alimentos propios y las comidas caseras (primero), y productos de Open Food
// Facts; y los recientes. Si no está, se puede crear.
export function BuscarAlimentoScreen({ dia, comida, onVolver, onEscanear, onCrear }: BuscarAlimentoScreenProps) {
  const insets = useSafeAreaInsets();
  const { registros, productos, propios, agregar } = useComidas();
  const [texto, setTexto] = useState('');
  const [pestana, setPestana] = useState<'resultados' | 'recientes'>('resultados');
  const [elegido, setElegido] = useState<{ alimento: Alimento; cantidad: Cantidad } | null>(null);
  const [envasados, setEnvasados] = useState<EstadoEnvasados>({ tipo: 'nada' });
  const [intento, setIntento] = useState(0); // "Reintentar" vuelve a buscar

  const consulta = normalizar(texto);
  // Los propios van primero: si alguien lo creó, es lo que busca.
  const locales = useMemo(
    () => [...(consulta ? buscarGuardados(propios, consulta) : []), ...buscarCaseras(texto)],
    [consulta, propios, texto],
  );
  const recientes = useMemo(() => alimentosRecientes(registros), [registros]);

  useEffect(() => {
    if (consulta.length < MINIMO_LETRAS) return;
    const control = new AbortController();
    const espera = setTimeout(() => {
      setEnvasados({ tipo: 'buscando', consulta });
      pedirBusqueda(consulta, control.signal)
        .then((r) => setEnvasados({ tipo: 'listo', consulta, ...r }))
        .catch((error: unknown) => {
          if (!control.signal.aborted)
            setEnvasados({ tipo: esErrorLimite(error) ? 'limite' : 'sin-conexion', consulta });
        });
    }, ESPERA_BUSQUEDA_MS);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [consulta, intento]);

  // Sólo vale lo que corresponde a lo que está escrito ahora.
  const actual = consulta.length >= MINIMO_LETRAS && 'consulta' in envasados && envasados.consulta === consulta;
  const resultados = useMemo(() => {
    if (actual && envasados.tipo === 'listo') return combinarResultados(locales, envasados.argentina, envasados.mundo);
    // Sin conexión (o mientras busca), también los productos ya usados que coinciden.
    return combinarResultados(locales, consulta ? buscarGuardados(productos, consulta) : [], []);
  }, [actual, envasados, locales, consulta, productos]);

  const buscando = consulta.length >= MINIMO_LETRAS && (!actual || envasados.tipo === 'buscando');
  const lista = pestana === 'resultados' ? resultados : recientes;
  const abrir = (alimento: Alimento) => setElegido({ alimento, cantidad: cantidadInicial(alimento) });

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top + 8 }]}>
      <View style={styles.encabezado}>
        <Pressable
          onPress={onVolver}
          hitSlop={8}
          style={styles.botonRedondo}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={20} color={colores.texto} />
        </Pressable>
        <View>
          <Text style={styles.agregarA}>Agregar a</Text>
          <Text style={styles.titulo} accessibilityRole="header">
            {NOMBRE_COMIDA[comida]}
          </Text>
        </View>
      </View>

      <View style={styles.buscador}>
        <Ionicons name="search" size={18} color={colores.textoSecundario} />
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t);
            setPestana('resultados');
          }}
          placeholder="Milanesa, yogur, alfajor…"
          placeholderTextColor={colores.textoSecundario}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          style={styles.entrada}
          accessibilityLabel="Buscar alimento"
        />
        <Pressable
          onPress={onEscanear}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Escanear código de barras"
        >
          <Ionicons name="barcode-outline" size={22} color={colores.textoSecundario} />
        </Pressable>
      </View>

      <View style={styles.pestanas} accessibilityRole="tablist">
        {(['resultados', 'recientes'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPestana(p)}
            style={[styles.pestana, pestana === p && styles.pestanaActiva]}
            accessibilityRole="tab"
            accessibilityState={{ selected: pestana === p }}
          >
            <Text style={[styles.textoPestana, pestana === p && styles.textoPestanaActiva]}>
              {p === 'resultados' ? 'Resultados' : 'Recientes'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={lista}
        keyExtractor={(a) => a.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => <Fila alimento={item} onPress={() => abrir(item)} />}
        ListHeaderComponent={
          pestana !== 'resultados' || !actual ? undefined : envasados.tipo === 'sin-conexion' ? (
            <Text style={styles.aviso}>Sin conexión: mostramos las comidas caseras y los productos que ya usaste.</Text>
          ) : envasados.tipo === 'limite' ? (
            <Pressable onPress={() => setIntento((i) => i + 1)} accessibilityRole="button">
              <Text style={styles.aviso}>
                Open Food Facts está recibiendo muchos pedidos. Probá de nuevo en un momento.{' '}
                <Text style={styles.reintentar}>Reintentar</Text>
              </Text>
            </Pressable>
          ) : undefined
        }
        ListFooterComponent={
          pestana !== 'resultados' || consulta.length === 0 ? undefined : buscando ? (
            <View style={styles.buscando}>
              <ActivityIndicator color={colores.textoSecundario} />
              <Text style={styles.textoVacio}>Buscando productos…</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => onCrear(texto.trim())}
              style={({ pressed }) => [styles.crear, pressed && styles.presionado]}
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={22} color={colores.acento} />
              <View style={styles.flex}>
                <Text style={styles.textoCrear}>Crear alimento</Text>
                <Text style={styles.subtitulo}>¿No está? Cargalo con los datos de la etiqueta.</Text>
              </View>
            </Pressable>
          )
        }
        ListEmptyComponent={
          <Text style={styles.textoVacio}>
            {pestana === 'recientes'
              ? 'Acá aparecen los últimos alimentos que cargaste.'
              : consulta.length === 0
                ? 'Escribí qué comiste, o escaneá el código del envase.'
                : actual && envasados.tipo === 'listo'
                  ? 'No encontramos nada con ese nombre.'
                  : ''}
          </Text>
        }
      />

      <HojaPorcion
        abierta={elegido}
        textoBoton={textoAgregarA(comida)}
        onConfirmar={(alimento, cantidad) => {
          agregar(dia, comida, alimento, cantidad);
          setElegido(null);
          onVolver();
        }}
        onCerrar={() => setElegido(null)}
      />
    </View>
  );
}

function Fila({ alimento, onPress }: { alimento: Alimento; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fila, pressed && styles.presionado]}
      accessibilityRole="button"
    >
      <View style={styles.flex}>
        <Text style={styles.nombre} numberOfLines={2}>
          {alimento.nombre}
        </Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {subtituloAlimento(alimento)}
        </Text>
      </View>
      <View style={styles.mas}>
        <Ionicons name="add" size={20} color={colores.texto} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo, paddingHorizontal: 16 },
  flex: { flex: 1 },
  presionado: { opacity: 0.7 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agregarA: { color: colores.textoSecundario, fontSize: 13 },
  titulo: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: radios.medio,
    borderWidth: 1.5,
    borderColor: colores.acento,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: 14,
  },
  entrada: { flex: 1, color: colores.texto, fontSize: 17, padding: 0 },
  pestanas: {
    flexDirection: 'row',
    backgroundColor: colores.tarjeta,
    borderRadius: 14,
    padding: 4,
    marginTop: 14,
    marginBottom: 6,
  },
  pestana: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  pestanaActiva: { backgroundColor: colores.tarjetaElevada },
  textoPestana: { color: colores.textoSecundario, fontSize: 15, fontWeight: '700' },
  textoPestanaActiva: { color: colores.texto },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colores.borde,
  },
  nombre: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  subtitulo: { color: colores.textoSecundario, fontSize: 13, marginTop: 3 },
  mas: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crear: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  textoCrear: { color: colores.acento, fontSize: 16, fontWeight: '800' },
  reintentar: { color: colores.texto, fontWeight: '800', textDecorationLine: 'underline' },
  aviso: { color: colores.acentoSuave, fontSize: 13, paddingVertical: 10 },
  buscando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  textoVacio: { color: colores.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
