import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ControlPorcion } from '../components/comida/ControlPorcion';
import { useComidas } from '../estado/Comidas';
import { subtituloAlimento, type Alimento } from '../lib/comida/alimentos';
import { pedirProducto } from '../lib/comida/clienteOff';
import { textoAgregarA, type Comida } from '../lib/comida/diario';
import { buscarPorCodigo, codigoValido, esErrorLimite } from '../lib/comida/openFoodFacts';
import { cantidadInicial, nutrientesCantidad, type Cantidad } from '../lib/comida/porciones';
import { formatearNumero } from '../lib/formato';
import { colores, radios } from '../theme/tema';

type Lectura =
  | { tipo: 'buscando'; codigo: string }
  | { tipo: 'encontrado'; codigo: string; alimento: Alimento; cantidad: Cantidad }
  | { tipo: 'no-encontrado'; codigo: string; sinKcal: boolean }
  | { tipo: 'error'; codigo: string; limite: boolean }; // sin conexión, o Open Food Facts cortó por muchos pedidos

interface EscanearCodigoScreenProps {
  dia: string;
  comida: Comida;
  onCerrar: () => void;
  onBuscarPorNombre: () => void;
  onCrear: (codigo: string) => void; // crear un alimento propio con ese código
}

// Escáner de código de barras: al detectar un código, la tarjeta del producto.
export function EscanearCodigoScreen({ dia, comida, onCerrar, onBuscarPorNombre, onCrear }: EscanearCodigoScreenProps) {
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [linterna, setLinterna] = useState(false);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const { productos, propios, agregar, recordar } = useComidas();
  const pedido = useRef<AbortController | null>(null);
  // La cámara puede avisar el mismo código varias veces seguidas: se toma el primero.
  const leyendo = useRef(false);

  useEffect(() => () => pedido.current?.abort(), []);

  const buscar = (codigo: string) => {
    // Primero los creados por el usuario y los ya usados: andan sin internet.
    const guardado = buscarPorCodigo(propios, codigo) ?? buscarPorCodigo(productos, codigo);
    if (guardado) {
      setLectura({ tipo: 'encontrado', codigo, alimento: guardado, cantidad: cantidadInicial(guardado) });
      return;
    }
    setLectura({ tipo: 'buscando', codigo });
    pedido.current?.abort();
    const control = new AbortController();
    pedido.current = control;
    pedirProducto(codigo, control.signal)
      .then((r) => {
        if (control.signal.aborted) return;
        if (r.tipo === 'encontrado') {
          recordar(r.alimento);
          setLectura({ tipo: 'encontrado', codigo, alimento: r.alimento, cantidad: cantidadInicial(r.alimento) });
        } else {
          setLectura({ tipo: 'no-encontrado', codigo, sinKcal: r.tipo === 'sin-kcal' });
        }
      })
      .catch((error: unknown) => {
        if (!control.signal.aborted) setLectura({ tipo: 'error', codigo, limite: esErrorLimite(error) });
      });
  };

  const alLeer = ({ data }: BarcodeScanningResult) => {
    if (leyendo.current || !codigoValido(data)) return;
    leyendo.current = true;
    buscar(data.trim());
  };

  const otraVez = () => {
    pedido.current?.abort();
    leyendo.current = false;
    setLectura(null);
  };

  if (!permiso) return <View style={styles.pantalla} />;

  return (
    <View style={styles.pantalla}>
      {permiso.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={linterna}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={lectura === null ? alLeer : undefined}
        />
      ) : (
        <View style={styles.sinPermiso}>
          <Ionicons name="camera-outline" size={40} color={colores.textoSecundario} />
          <Text style={styles.textoSinPermiso}>Para escanear el código necesitamos usar la cámara.</Text>
          <Pressable
            onPress={permiso.canAskAgain ? pedirPermiso : () => Linking.openSettings()}
            style={styles.botonSecundario}
            accessibilityRole="button"
          >
            <Text style={styles.textoBotonSecundario}>
              {permiso.canAskAgain ? 'Permitir la cámara' : 'Abrir la configuración'}
            </Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.encabezado, { paddingTop: insets.top + 8 }]}>
        <BotonRedondo icono="close" etiqueta="Cerrar" onPress={onCerrar} />
        <Text style={styles.titulo} accessibilityRole="header">
          Escaneá el código
        </Text>
        {permiso.granted ? (
          <BotonRedondo
            icono={linterna ? 'flash' : 'flash-outline'}
            etiqueta={linterna ? 'Apagar la linterna' : 'Prender la linterna'}
            onPress={() => setLinterna((l) => !l)}
          />
        ) : (
          <View style={styles.botonRedondo} />
        )}
      </View>

      {permiso.granted && lectura === null && (
        <View style={styles.centro} pointerEvents="none">
          <View style={styles.recuadro}>
            <View style={[styles.esquina, styles.arribaIzquierda]} />
            <View style={[styles.esquina, styles.arribaDerecha]} />
            <View style={[styles.esquina, styles.abajoIzquierda]} />
            <View style={[styles.esquina, styles.abajoDerecha]} />
            <View style={styles.linea} />
          </View>
          <Text style={styles.ayuda}>Centrá el código dentro del recuadro</Text>
        </View>
      )}

      {lectura && (
        <View style={[styles.tarjeta, { marginBottom: Math.max(insets.bottom, 16) }]}>
          {lectura.tipo === 'buscando' && (
            <View style={styles.filaBuscando}>
              <ActivityIndicator color={colores.texto} />
              <Text style={styles.texto}>Buscando {lectura.codigo}…</Text>
            </View>
          )}

          {lectura.tipo === 'encontrado' && (
            <Encontrado
              lectura={lectura}
              onCambiar={(cantidad) => setLectura({ ...lectura, cantidad })}
              textoBoton={textoAgregarA(comida)}
              onAgregar={() => {
                agregar(dia, comida, lectura.alimento, lectura.cantidad);
                onCerrar();
              }}
            />
          )}

          {lectura.tipo === 'no-encontrado' && (
            <>
              <Text style={styles.tituloTarjeta}>No lo encontramos</Text>
              <Text style={styles.texto}>
                {lectura.sinKcal
                  ? `El producto ${lectura.codigo} está en Open Food Facts pero sin las calorías cargadas.`
                  : `El código ${lectura.codigo} no está en Open Food Facts.`}{' '}
                Buscalo por nombre o crealo con los datos de la etiqueta.
              </Text>
              <Pressable onPress={onBuscarPorNombre} style={styles.boton} accessibilityRole="button">
                <Text style={styles.textoBoton}>Buscar por nombre</Text>
              </Pressable>
              <Pressable
                onPress={() => onCrear(lectura.codigo)}
                style={[styles.boton, styles.botonCrear]}
                accessibilityRole="button"
              >
                <Text style={styles.textoBoton}>Crear alimento</Text>
              </Pressable>
              <BotonTexto texto="Escanear otro" onPress={otraVez} />
            </>
          )}

          {lectura.tipo === 'error' && (
            <>
              <Text style={styles.tituloTarjeta}>
                {lectura.limite ? 'Probá de nuevo en un momento' : 'No pudimos conectarnos'}
              </Text>
              <Text style={styles.texto}>
                {lectura.limite
                  ? 'Open Food Facts está recibiendo muchos pedidos.'
                  : 'Revisá tu conexión a internet y probá de nuevo.'}
              </Text>
              <Pressable onPress={() => buscar(lectura.codigo)} style={styles.boton} accessibilityRole="button">
                <Text style={styles.textoBoton}>Reintentar</Text>
              </Pressable>
              <BotonTexto texto="Escanear otro" onPress={otraVez} />
            </>
          )}
        </View>
      )}
    </View>
  );
}

function Encontrado({
  lectura,
  onCambiar,
  textoBoton,
  onAgregar,
}: {
  lectura: Extract<Lectura, { tipo: 'encontrado' }>;
  onCambiar: (cantidad: Cantidad) => void;
  textoBoton: string;
  onAgregar: () => void;
}) {
  const { alimento, cantidad, codigo } = lectura;
  return (
    <>
      <View style={styles.filaDetectado}>
        <Ionicons name="checkmark" size={16} color={colores.acentoSuave} />
        <Text style={styles.detectado}>Producto detectado · {codigo}</Text>
      </View>
      <View style={styles.filaProducto}>
        {alimento.imagen ? (
          <Image source={{ uri: alimento.imagen }} style={styles.imagen} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.imagen, styles.sinImagen]}>
            <Ionicons name="cube-outline" size={24} color={colores.textoSecundario} />
          </View>
        )}
        <View style={styles.flex}>
          <Text style={styles.tituloTarjeta} numberOfLines={2}>
            {alimento.nombre}
          </Text>
          <Text style={styles.texto}>{subtituloAlimento(alimento)}</Text>
        </View>
      </View>
      <ControlPorcion alimento={alimento} cantidad={cantidad} onCambiar={onCambiar} compacto />
      <Pressable onPress={onAgregar} style={[styles.boton, styles.botonAgregar]} accessibilityRole="button">
        <Text style={styles.textoBoton}>{textoBoton}</Text>
        <Text style={styles.textoBoton}>{formatearNumero(nutrientesCantidad(alimento, cantidad).kcal)} kcal</Text>
      </Pressable>
    </>
  );
}

function BotonRedondo({
  icono,
  etiqueta,
  onPress,
}: {
  icono: 'close' | 'flash' | 'flash-outline';
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.botonRedondo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
    >
      <Ionicons name={icono} size={20} color={colores.texto} />
    </Pressable>
  );
}

function BotonTexto({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.botonTexto} accessibilityRole="button">
      <Text style={styles.textoBotonSecundario}>{texto}</Text>
    </Pressable>
  );
}

const ESQUINA = 34;
const GROSOR = 4;

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  encabezado: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  titulo: { color: colores.texto, fontSize: 18, fontWeight: '800' },
  botonRedondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(40,40,40,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  recuadro: { width: 280, height: 170, justifyContent: 'center' },
  esquina: { position: 'absolute', width: ESQUINA, height: ESQUINA, borderColor: colores.acento },
  arribaIzquierda: { top: 0, left: 0, borderTopWidth: GROSOR, borderLeftWidth: GROSOR, borderTopLeftRadius: 14 },
  arribaDerecha: { top: 0, right: 0, borderTopWidth: GROSOR, borderRightWidth: GROSOR, borderTopRightRadius: 14 },
  abajoIzquierda: {
    bottom: 0,
    left: 0,
    borderBottomWidth: GROSOR,
    borderLeftWidth: GROSOR,
    borderBottomLeftRadius: 14,
  },
  abajoDerecha: {
    bottom: 0,
    right: 0,
    borderBottomWidth: GROSOR,
    borderRightWidth: GROSOR,
    borderBottomRightRadius: 14,
  },
  linea: { height: 2, marginHorizontal: 18, backgroundColor: colores.acento },
  ayuda: { color: colores.texto, fontSize: 15, fontWeight: '600' },
  sinPermiso: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  textoSinPermiso: { color: colores.texto, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  tarjeta: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: colores.tarjeta,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  filaBuscando: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  filaDetectado: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detectado: { color: colores.acentoSuave, fontSize: 13, fontWeight: '800' },
  filaProducto: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  imagen: { width: 56, height: 56, borderRadius: 12, backgroundColor: colores.tarjetaElevada },
  sinImagen: { alignItems: 'center', justifyContent: 'center' },
  tituloTarjeta: { color: colores.texto, fontSize: 20, fontWeight: '800' },
  texto: { color: colores.textoSecundario, fontSize: 14, lineHeight: 20 },
  boton: {
    height: 56,
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  botonCrear: { backgroundColor: colores.tarjetaElevada },
  botonAgregar: { flexDirection: 'row', justifyContent: 'space-between' },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  botonSecundario: {
    paddingHorizontal: 20,
    height: 48,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    justifyContent: 'center',
  },
  botonTexto: { alignItems: 'center', paddingVertical: 4 },
  textoBotonSecundario: { color: colores.texto, fontSize: 15, fontWeight: '700' },
});
