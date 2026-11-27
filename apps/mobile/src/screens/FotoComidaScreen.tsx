import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoDeshacer } from '../components/coach/AvisoDeshacer';
import { ControlPorcion } from '../components/comida/ControlPorcion';
import { useComidas } from '../estado/Comidas';
import { leerIdDispositivo } from '../lib/almacenamiento';
import { crearClienteApi } from '../lib/api';
import { DESHACER_MS } from '../lib/coach/acciones';
import { subtituloAlimento } from '../lib/comida/alimentos';
import {
  alimentosRecientes,
  COMIDAS,
  NOMBRE_COMIDA,
  textoAgregarA,
  type Comida,
  type RegistroComida,
} from '../lib/comida/diario';
import {
  CONFIANZA_BAJA,
  errorFoto,
  registrosConFoto,
  resolverItemsFoto,
  SIN_COMIDA,
  type ItemResultado,
} from '../lib/comida/fotoIa';
import { prepararFoto, type FotoLista } from '../lib/comida/jpegFoto';
import { nutrientesCantidad, sumarNutrientes } from '../lib/comida/porciones';
import { formatearNumero } from '../lib/formato';
import { claveDia } from '../lib/pasosManuales';
import { colores, radios } from '../theme/tema';

interface FotoComidaScreenProps {
  dia: string;
  comida: Comida; // la del "+" que se tocó; se puede cambiar en el resultado
  onVolver: () => void;
  onListo: () => void; // después de agregar: vuelve al diario
}

type Fase =
  | { fase: 'elegir'; aviso: string | null } // aviso: por qué no se pudo abrir la cámara o leer la foto
  | { fase: 'analizando'; foto: FotoLista }
  | { fase: 'resultado'; foto: FotoLista; items: ItemResultado[] }
  | {
      fase: 'agregado';
      foto: FotoLista;
      items: ItemResultado[];
      anterior: RegistroComida[];
      vence: number;
      kcal: number;
    }
  | { fase: 'error'; foto: FotoLista; mensaje: string; reintentar: boolean };

const kcalDe = (items: readonly ItemResultado[]) =>
  sumarNutrientes(items.map((i) => nutrientesCantidad(i.alimento, i.cantidad))).kcal;

// Foto del plato con IA: sacarla o elegirla, mandarla achicada a la API y revisar lo que encontró
// (buscado en la base del celu, como las comidas del coach) antes de agregarlo al diario.
export function FotoComidaScreen({ dia, comida: comidaInicial, onVolver, onListo }: FotoComidaScreenProps) {
  const insets = useSafeAreaInsets();
  const { registros, propios, reemplazarRegistros } = useComidas();
  const cliente = useMemo(() => crearClienteApi({ dispositivo: leerIdDispositivo }), []);
  const base = useMemo(() => ({ recientes: alimentosRecientes(registros), propios }), [registros, propios]);
  const [estado, setEstado] = useState<Fase>({ fase: 'elegir', aviso: null });
  const [comida, setComida] = useState<Comida>(comidaInicial);
  const pedido = useRef<AbortController | null>(null);

  // Si se va de la pantalla mientras analiza, se corta el pedido.
  useEffect(() => () => pedido.current?.abort(), []);

  const analizar = async (foto: FotoLista) => {
    pedido.current?.abort();
    const control = new AbortController();
    pedido.current = control;
    setEstado({ fase: 'analizando', foto });
    try {
      const items = await cliente.fotoComida(foto.jpeg, comidaInicial, control.signal);
      if (control.signal.aborted) return;
      if (items.length === 0) setEstado({ fase: 'error', foto, mensaje: SIN_COMIDA, reintentar: false });
      else setEstado({ fase: 'resultado', foto, items: resolverItemsFoto(items, base) });
    } catch (e) {
      if (control.signal.aborted) return;
      setEstado({ fase: 'error', foto, ...errorFoto(e) });
    }
  };

  const elegir = async (origen: 'camara' | 'galeria') => {
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    let resultado: ImagePicker.ImagePickerResult;
    if (origen === 'camara') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        return setEstado({ fase: 'elegir', aviso: 'Para sacar la foto, permití el acceso a la cámara en Ajustes.' });
      }
      resultado = await ImagePicker.launchCameraAsync(opciones);
    } else {
      resultado = await ImagePicker.launchImageLibraryAsync(opciones);
    }
    const asset = resultado.canceled ? null : resultado.assets[0];
    if (!asset) return;
    let foto: FotoLista;
    try {
      foto = await prepararFoto(asset.uri, asset.width, asset.height);
    } catch {
      return setEstado({ fase: 'elegir', aviso: 'No pudimos leer esa foto. Probá con otra.' });
    }
    analizar(foto);
  };

  const agregar = (foto: FotoLista, items: ItemResultado[]) => {
    const ahora = new Date();
    reemplazarRegistros(registrosConFoto(registros, dia, comida, items, ahora, claveDia(ahora)));
    setEstado({
      fase: 'agregado',
      foto,
      items,
      anterior: registros,
      vence: ahora.getTime() + DESHACER_MS,
      kcal: kcalDe(items),
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
          <Text style={styles.agregarA}>Foto con IA</Text>
          <Text style={styles.titulo} accessibilityRole="header">
            {NOMBRE_COMIDA[comida]}
          </Text>
        </View>
      </View>

      {estado.fase === 'elegir' && (
        <View style={styles.elegir}>
          <Text style={styles.texto}>
            Sacale una foto a tu plato y te digo qué hay y cuánto. Después podés corregir las cantidades antes de
            agregarlo.
          </Text>
          <BotonGrande icono="camera" titulo="Sacar foto" onPress={() => elegir('camara')} principal />
          <BotonGrande icono="images-outline" titulo="Elegir de la galería" onPress={() => elegir('galeria')} />
          <Text style={styles.nota}>Mejor desde arriba, con buena luz y todo el plato a la vista.</Text>
          {estado.aviso && (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {estado.aviso}
            </Text>
          )}
        </View>
      )}

      {estado.fase === 'analizando' && (
        <View style={styles.centro}>
          <Image source={{ uri: estado.foto.uri }} style={styles.fotoGrande} accessibilityIgnoresInvertColors />
          <ActivityIndicator color={colores.acento} size="large" />
          <Text style={styles.analizando} accessibilityLiveRegion="polite">
            Analizando tu plato…
          </Text>
        </View>
      )}

      {estado.fase === 'error' && (
        <View style={styles.centro}>
          <Image source={{ uri: estado.foto.uri }} style={styles.fotoGrande} accessibilityIgnoresInvertColors />
          <Text style={[styles.texto, styles.textoCentrado]} accessibilityLiveRegion="polite">
            {estado.mensaje}
          </Text>
          {estado.reintentar && (
            <BotonGrande icono="refresh" titulo="Probar de nuevo" onPress={() => analizar(estado.foto)} principal />
          )}
          <BotonGrande
            icono="camera-outline"
            titulo="Otra foto"
            onPress={() => setEstado({ fase: 'elegir', aviso: null })}
          />
        </View>
      )}

      {estado.fase === 'resultado' && (
        <Resultado
          foto={estado.foto}
          items={estado.items}
          comida={comida}
          onComida={setComida}
          onCambiarItems={(items) => setEstado({ ...estado, items })}
          onAgregar={() => agregar(estado.foto, estado.items)}
          margenAbajo={insets.bottom}
        />
      )}

      {estado.fase === 'agregado' && (
        <View style={[styles.centro, { paddingBottom: insets.bottom + 16 }]}>
          <Ionicons name="checkmark-circle" size={56} color={colores.verde} />
          <Text style={[styles.titulo, styles.textoCentrado]}>Listo</Text>
          <Text style={[styles.texto, styles.textoCentrado]}>
            Sumamos {formatearNumero(estado.kcal)} kcal a {NOMBRE_COMIDA[comida].toLowerCase()}.
          </Text>
          <BotonGrande icono="restaurant-outline" titulo="Volver al diario" onPress={onListo} principal />
          <View style={styles.aviso}>
            <AvisoDeshacer
              prefijo="Agregado"
              titulo={`${estado.items.length} ${estado.items.length === 1 ? 'alimento' : 'alimentos'}`}
              vence={estado.vence}
              onDeshacer={() => {
                reemplazarRegistros(estado.anterior);
                setEstado({ fase: 'resultado', foto: estado.foto, items: estado.items });
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function Resultado({
  foto,
  items,
  comida,
  onComida,
  onCambiarItems,
  onAgregar,
  margenAbajo,
}: {
  foto: FotoLista;
  items: ItemResultado[];
  comida: Comida;
  onComida: (c: Comida) => void;
  onCambiarItems: (items: ItemResultado[]) => void;
  onAgregar: () => void;
  margenAbajo: number;
}) {
  const kcal = kcalDe(items);
  return (
    <>
      <ScrollView contentContainerStyle={styles.resultado} keyboardShouldPersistTaps="handled">
        <Image source={{ uri: foto.uri }} style={styles.fotoChica} accessibilityIgnoresInvertColors />

        <Text style={styles.etiqueta}>¿A qué comida va?</Text>
        <View style={styles.comidas} accessibilityRole="radiogroup">
          {COMIDAS.map((c) => {
            const activa = c === comida;
            return (
              <Pressable
                key={c}
                onPress={() => onComida(c)}
                style={[styles.chip, activa && styles.chipActivo]}
                accessibilityRole="radio"
                accessibilityState={{ selected: activa }}
              >
                <Text style={[styles.textoChip, activa && styles.textoChipActivo]}>{NOMBRE_COMIDA[c]}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.etiqueta}>Lo que encontré</Text>
        {items.map((item, i) => (
          <View key={`${item.alimento.id}-${i}`} style={styles.item}>
            <View style={styles.filaItem}>
              <View style={styles.flex}>
                <Text style={styles.nombre}>{item.alimento.nombre}</Text>
                <Text style={styles.subtitulo}>
                  {item.donde === 'estimado' ? 'Aproximado: estimado de la foto' : subtituloAlimento(item.alimento)}
                </Text>
              </View>
              <Pressable
                onPress={() => onCambiarItems(items.filter((_, j) => j !== i))}
                hitSlop={8}
                style={styles.quitar}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${item.alimento.nombre}`}
              >
                <Ionicons name="trash-outline" size={18} color={colores.textoSecundario} />
              </Pressable>
            </View>
            {item.confianza < CONFIANZA_BAJA && (
              <Text style={styles.dudoso}>No estoy seguro de que sea esto: revisalo.</Text>
            )}
            <ControlPorcion
              alimento={item.alimento}
              cantidad={item.cantidad}
              onCambiar={(cantidad) => onCambiarItems(items.map((x, j) => (j === i ? { ...x, cantidad } : x)))}
            />
          </View>
        ))}
        {items.length === 0 && <Text style={styles.nota}>Quitaste todo. Volvé atrás para probar con otra foto.</Text>}
      </ScrollView>

      <View style={[styles.pie, { paddingBottom: Math.max(margenAbajo, 16) }]}>
        <Pressable
          onPress={onAgregar}
          disabled={items.length === 0}
          style={({ pressed }) => [
            styles.botonAgregar,
            items.length === 0 && styles.apagado,
            pressed && styles.presionado,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: items.length === 0 }}
        >
          {/* "Agregar al almuerzo · 650 kcal": cambia con la comida elegida. */}
          <Text style={styles.textoBotonAgregar}>
            {textoAgregarA(comida)} · {formatearNumero(kcal)} kcal
          </Text>
        </Pressable>
      </View>
    </>
  );
}

function BotonGrande({
  icono,
  titulo,
  principal = false,
  onPress,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  principal?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.botonGrande, principal && styles.botonPrincipal, pressed && styles.presionado]}
      accessibilityRole="button"
    >
      <Ionicons name={icono} size={20} color={colores.texto} />
      <Text style={styles.textoBotonGrande}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo, paddingHorizontal: 16 },
  flex: { flex: 1 },
  presionado: { opacity: 0.7 },
  apagado: { opacity: 0.4 },
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
  elegir: { gap: 14, paddingTop: 8 },
  texto: { color: colores.texto, fontSize: 16, lineHeight: 23 },
  textoCentrado: { textAlign: 'center' },
  nota: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  error: { color: colores.acentoSuave, fontSize: 14, lineHeight: 19 },
  centro: { flex: 1, alignItems: 'stretch', justifyContent: 'center', gap: 16 },
  fotoGrande: { width: '100%', aspectRatio: 1, borderRadius: radios.grande, backgroundColor: colores.tarjeta },
  analizando: { color: colores.texto, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  botonGrande: {
    height: 56,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonPrincipal: { backgroundColor: colores.acento },
  textoBotonGrande: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  resultado: { gap: 14, paddingBottom: 24 },
  fotoChica: { width: '100%', height: 180, borderRadius: radios.grande, backgroundColor: colores.tarjeta },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700', marginTop: 4 },
  comidas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActivo: { backgroundColor: colores.acento },
  textoChip: { color: colores.textoSecundario, fontSize: 14, fontWeight: '700' },
  textoChipActivo: { color: colores.texto },
  item: { backgroundColor: colores.tarjeta, borderRadius: radios.medio, padding: 16, gap: 10 },
  filaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nombre: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  subtitulo: { color: colores.textoSecundario, fontSize: 13, marginTop: 3 },
  dudoso: { color: colores.oro, fontSize: 13 },
  quitar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colores.tarjetaElevada,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pie: { paddingTop: 8 },
  botonAgregar: {
    height: 58,
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  textoBotonAgregar: { color: colores.texto, fontSize: 17, fontWeight: '800' },
  aviso: { marginTop: 8 },
});
