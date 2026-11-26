import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaPorcion } from '../components/comida/HojaPorcion';
import { useComidas } from '../estado/Comidas';
import { buscarCaseras, normalizar, subtituloAlimento, type Alimento } from '../lib/comida/alimentos';
import { pedirBusqueda, pedirProducto } from '../lib/comida/clienteOff';
import { alimentosRecientes, NOMBRE_COMIDA, textoAgregarA, type Comida } from '../lib/comida/diario';
import {
  armarResultados,
  BUSQUEDA_VACIA,
  buscarGuardados,
  claveItem,
  esErrorLimite,
  type ItemResultado,
  type ProductoSinDatos,
  type ResultadoBusquedaOff,
} from '../lib/comida/openFoodFacts';
import type { DatosIniciales } from '../lib/comida/propios';
import { cantidadInicial, type Cantidad } from '../lib/comida/porciones';
import { colores, radios } from '../theme/tema';

// Se busca en Open Food Facts después de dejar de escribir un rato, y desde 3 letras.
const ESPERA_BUSQUEDA_MS = 400;
const MINIMO_LETRAS = 3;

type EstadoEnvasados =
  | { tipo: 'nada' }
  | { tipo: 'buscando'; consulta: string }
  | { tipo: 'listo'; consulta: string; argentina: ResultadoBusquedaOff; mundo: ResultadoBusquedaOff }
  | { tipo: 'sin-conexion'; consulta: string }
  | { tipo: 'limite'; consulta: string }; // Open Food Facts cortó por muchos pedidos

interface BuscarAlimentoScreenProps {
  dia: string;
  comida: Comida;
  onVolver: () => void;
  onEscanear: () => void;
  onCrear: (datos: DatosIniciales) => void; // crear un alimento propio
}

// Buscador: los alimentos propios y las comidas caseras (primero), y productos de Open Food
// Facts; y los recientes. Si no está, se puede crear.
export function BuscarAlimentoScreen({ dia, comida, onVolver, onEscanear, onCrear }: BuscarAlimentoScreenProps) {
  const insets = useSafeAreaInsets();
  const { registros, productos, propios, agregar, recordar } = useComidas();
  const [texto, setTexto] = useState('');
  const [pestana, setPestana] = useState<'resultados' | 'recientes'>('resultados');
  const [elegido, setElegido] = useState<{ alimento: Alimento; cantidad: Cantidad } | null>(null);
  const [envasados, setEnvasados] = useState<EstadoEnvasados>({ tipo: 'nada' });
  const [intento, setIntento] = useState(0); // "Reintentar" vuelve a buscar
  // Un producto sin datos que se está pidiendo por código, y el aviso si no se pudo.
  const [pidiendo, setPidiendo] = useState<string | null>(null);
  const [avisoProducto, setAvisoProducto] = useState<string | null>(null);
  const pedido = useRef<AbortController | null>(null);
  useEffect(() => () => pedido.current?.abort(), []);

  const consulta = normalizar(texto);
  // Los propios van primero: si alguien lo creó, es lo que busca.
  const locales = useMemo(
    () => [...(consulta ? buscarGuardados(propios, consulta) : []), ...buscarCaseras(texto)],
    [consulta, propios, texto],
  );
  const recientes = useMemo(
    () => alimentosRecientes(registros).map((alimento): ItemResultado => ({ tipo: 'alimento', alimento })),
    [registros],
  );

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
    // Los sin datos que ya se crearon o se pidieron por código aparecen con sus datos.
    const guardados = [...propios, ...productos];
    if (actual && envasados.tipo === 'listo') {
      return armarResultados(locales, envasados.argentina, envasados.mundo, guardados);
    }
    // Sin conexión (o mientras busca), también los productos ya usados que coinciden.
    const usados = consulta ? buscarGuardados(productos, consulta) : [];
    return armarResultados(locales, { alimentos: usados, sinDatos: [] }, BUSQUEDA_VACIA, guardados);
  }, [actual, envasados, locales, consulta, productos, propios]);

  const buscando = consulta.length >= MINIMO_LETRAS && (!actual || envasados.tipo === 'buscando');
  const lista = pestana === 'resultados' ? resultados : recientes;
  const abrir = (alimento: Alimento) => setElegido({ alimento, cantidad: cantidadInicial(alimento) });

  // Un producto sin datos: la búsqueda a veces no trae las kcal que el producto sí tiene, así que
  // primero se pide por código. Si tampoco las tiene, "Crear alimento" con lo que se sabe.
  const completar = (producto: ProductoSinDatos) => {
    pedido.current?.abort();
    const control = new AbortController();
    pedido.current = control;
    setPidiendo(producto.codigo);
    setAvisoProducto(null);
    const crear = () =>
      onCrear({ nombre: producto.nombre, marca: producto.marca ?? undefined, codigo: producto.codigo });
    pedirProducto(producto.codigo, control.signal)
      .then((r) => {
        if (control.signal.aborted) return;
        if (r.tipo === 'encontrado') {
          recordar(r.alimento);
          abrir(r.alimento);
        } else crear();
      })
      .catch((error: unknown) => {
        if (control.signal.aborted) return;
        // Sin conexión no se puede saber si tiene datos: se carga con la etiqueta.
        if (esErrorLimite(error)) {
          setAvisoProducto('Open Food Facts está recibiendo muchos pedidos. Probá de nuevo en un momento.');
        } else crear();
      })
      .finally(() => {
        if (!control.signal.aborted) setPidiendo(null);
      });
  };

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

      {avisoProducto && (
        <Text style={styles.aviso} accessibilityLiveRegion="polite">
          {avisoProducto}
        </Text>
      )}

      <FlatList
        data={lista}
        keyExtractor={claveItem}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) =>
          item.tipo === 'alimento' ? (
            <Fila alimento={item.alimento} onPress={() => abrir(item.alimento)} />
          ) : (
            <FilaSinDatos
              producto={item.producto}
              pidiendo={pidiendo === item.producto.codigo}
              onPress={() => {
                if (pidiendo === null) completar(item.producto);
              }}
            />
          )
        }
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
              onPress={() => onCrear({ nombre: texto.trim() })}
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

// Está en Open Food Facts pero sin kcal: al tocarlo, se completa.
function FilaSinDatos({
  producto,
  pidiendo,
  onPress,
}: {
  producto: ProductoSinDatos;
  pidiendo: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fila, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityHint="Completalo con los datos de la etiqueta"
      accessibilityState={{ busy: pidiendo }}
    >
      <View style={styles.flex}>
        <Text style={styles.nombre} numberOfLines={2}>
          {producto.nombre}
        </Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {producto.marca ?? 'Envasado'} · <Text style={styles.sinDatos}>Sin datos nutricionales</Text>
        </Text>
      </View>
      <View style={[styles.mas, styles.masSinDatos]}>
        {pidiendo ? (
          <ActivityIndicator size="small" color={colores.texto} />
        ) : (
          <Ionicons name="create-outline" size={18} color={colores.texto} />
        )}
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
  sinDatos: { color: colores.acentoSuave },
  masSinDatos: { backgroundColor: colores.tarjeta },
  aviso: { color: colores.acentoSuave, fontSize: 13, paddingVertical: 10 },
  buscando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  textoVacio: { color: colores.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
});
