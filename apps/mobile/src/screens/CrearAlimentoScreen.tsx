import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaPorcion } from '../components/comida/HojaPorcion';
import { useComidas } from '../estado/Comidas';
import type { Alimento } from '../lib/comida/alimentos';
import { NOMBRE_COMIDA, textoAgregarA, type Comida } from '../lib/comida/diario';
import { cantidadInicial } from '../lib/comida/porciones';
import {
  alimentoDesdeBorrador,
  BORRADOR_ALIMENTO_VACIO,
  erroresAlimento,
  LIMITES_ALIMENTO,
  type BaseEtiqueta,
  type BorradorAlimento,
} from '../lib/comida/propios';
import { formatearNumero } from '../lib/formato';
import { colores, radios } from '../theme/tema';

const nuevoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface CrearAlimentoScreenProps {
  dia: string;
  comida: Comida;
  nombreInicial?: string; // lo que se había buscado
  codigoInicial?: string; // el código escaneado
  onVolver: () => void;
  onListo: () => void; // después de agregarlo al diario
}

// Crear un alimento propio con la tabla nutricional de la etiqueta.
export function CrearAlimentoScreen({
  dia,
  comida,
  nombreInicial = '',
  codigoInicial = '',
  onVolver,
  onListo,
}: CrearAlimentoScreenProps) {
  const insets = useSafeAreaInsets();
  const { crearPropio, agregar } = useComidas();
  const [borrador, setBorrador] = useState<BorradorAlimento>({
    ...BORRADOR_ALIMENTO_VACIO,
    nombre: nombreInicial,
    codigo: codigoInicial,
  });
  const [intentado, setIntentado] = useState(false); // los errores se ven al tocar "Crear"
  const [creado, setCreado] = useState<Alimento | null>(null);

  const errores = intentado ? erroresAlimento(borrador) : {};
  const vistaPrevia = alimentoDesdeBorrador(borrador, 'vista-previa');
  const cambiar = (cambios: Partial<BorradorAlimento>) => setBorrador((b) => ({ ...b, ...cambios }));
  const porPorcion = borrador.base === 'porcion';

  const crear = () => {
    const alimento = alimentoDesdeBorrador(borrador, nuevoId());
    if (!alimento) return setIntentado(true);
    crearPropio(alimento);
    setCreado(alimento);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.pantalla, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          <Text style={styles.chico}>Para {NOMBRE_COMIDA[comida].toLowerCase()}</Text>
          <Text style={styles.titulo} accessibilityRole="header">
            Crear alimento
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <TextInput
            value={borrador.nombre}
            onChangeText={(nombre) => cambiar({ nombre })}
            placeholder="Ej.: Alfajor de la cooperativa"
            placeholderTextColor={colores.textoSecundario}
            maxLength={LIMITES_ALIMENTO.nombre}
            style={[styles.entrada, errores.nombre && styles.entradaError]}
            accessibilityLabel="Nombre"
          />
        </Campo>

        <Campo etiqueta="La etiqueta trae los valores…">
          <View style={styles.selector} accessibilityRole="tablist">
            {(['100g', 'porcion'] as BaseEtiqueta[]).map((base) => (
              <Pressable
                key={base}
                onPress={() => cambiar({ base })}
                style={[styles.opcion, borrador.base === base && styles.opcionActiva]}
                accessibilityRole="tab"
                accessibilityState={{ selected: borrador.base === base }}
              >
                <Text style={[styles.textoOpcion, borrador.base === base && styles.textoOpcionActiva]}>
                  {base === '100g' ? 'Cada 100 g' : 'Por porción'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Campo>

        <View style={styles.fila}>
          <CampoNumero
            etiqueta={porPorcion ? 'Porción' : 'Porción (opcional)'}
            unidad="g"
            valor={borrador.porcionGramos}
            error={errores.porcionGramos}
            onCambiar={(porcionGramos) => cambiar({ porcionGramos })}
          />
          <Campo etiqueta="Se llama (opcional)" flex>
            <TextInput
              value={borrador.porcionNombre}
              onChangeText={(porcionNombre) => cambiar({ porcionNombre })}
              placeholder="alfajor, galletita…"
              placeholderTextColor={colores.textoSecundario}
              maxLength={20}
              autoCapitalize="none"
              style={styles.entrada}
              accessibilityLabel="Nombre de la porción"
            />
          </Campo>
        </View>

        <Text style={styles.subtitulo}>
          {porPorcion
            ? `Por porción${borrador.porcionGramos.trim() ? ` de ${borrador.porcionGramos.trim()} g` : ''}`
            : 'Cada 100 g'}
        </Text>
        <View style={styles.fila}>
          <CampoNumero
            etiqueta="Calorías"
            unidad="kcal"
            valor={borrador.kcal}
            error={errores.kcal}
            onCambiar={(kcal) => cambiar({ kcal })}
          />
          <CampoNumero
            etiqueta="Proteínas"
            unidad="g"
            valor={borrador.proteinas}
            error={errores.proteinas}
            onCambiar={(proteinas) => cambiar({ proteinas })}
          />
        </View>
        <View style={styles.fila}>
          <CampoNumero
            etiqueta="Carbohidratos"
            unidad="g"
            valor={borrador.carbos}
            error={errores.carbos}
            onCambiar={(carbos) => cambiar({ carbos })}
          />
          <CampoNumero
            etiqueta="Grasas"
            unidad="g"
            valor={borrador.grasas}
            error={errores.grasas}
            onCambiar={(grasas) => cambiar({ grasas })}
          />
        </View>
        <Text style={styles.ayuda}>Si la etiqueta no trae algún macro, dejalo vacío y cuenta como 0.</Text>

        {codigoInicial ? (
          <View style={styles.codigo}>
            <Ionicons name="barcode-outline" size={18} color={colores.textoSecundario} />
            <Text style={styles.ayuda}>Código escaneado: {codigoInicial}</Text>
          </View>
        ) : (
          <CampoNumero
            etiqueta="Código de barras (opcional)"
            valor={borrador.codigo}
            error={errores.codigo}
            largo={14}
            teclado="number-pad"
            onCambiar={(codigo) => cambiar({ codigo })}
          />
        )}

        {porPorcion && vistaPrevia && (
          <Text style={styles.ayuda}>
            Cada 100 g: {formatearNumero(vistaPrevia.kcal)} kcal · {formatearNumero(vistaPrevia.proteinas)} g prot. ·{' '}
            {formatearNumero(vistaPrevia.carbos)} g carbos · {formatearNumero(vistaPrevia.grasas)} g grasas
          </Text>
        )}

        <Pressable
          onPress={crear}
          style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton}>Crear alimento</Text>
        </Pressable>
        <Text style={styles.ayuda}>Queda guardado en tu celu y aparece en las búsquedas.</Text>
      </ScrollView>

      <HojaPorcion
        abierta={creado && { alimento: creado, cantidad: cantidadInicial(creado) }}
        textoBoton={textoAgregarA(comida)}
        onConfirmar={(alimento, cantidad) => {
          agregar(dia, comida, alimento, cantidad);
          setCreado(null);
          onListo();
        }}
        // Si no se agrega ahora, igual queda creado.
        onCerrar={() => {
          setCreado(null);
          onVolver();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Campo({
  etiqueta,
  error,
  flex = false,
  children,
}: {
  etiqueta: string;
  error?: string;
  flex?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.campo, flex && styles.flex]}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      {children}
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

function CampoNumero({
  etiqueta,
  unidad,
  valor,
  error,
  largo = 6,
  teclado = 'decimal-pad',
  onCambiar,
}: {
  etiqueta: string;
  unidad?: string;
  valor: string;
  error?: string;
  largo?: number;
  teclado?: KeyboardTypeOptions;
  onCambiar: (valor: string) => void;
}) {
  return (
    <Campo etiqueta={etiqueta} error={error} flex>
      <View style={[styles.entradaNumero, error && styles.entradaError]}>
        <TextInput
          value={valor}
          onChangeText={onCambiar}
          keyboardType={teclado}
          maxLength={largo}
          style={styles.numero}
          accessibilityLabel={unidad ? `${etiqueta} en ${unidad}` : etiqueta}
        />
        {unidad && <Text style={styles.unidad}>{unidad}</Text>}
      </View>
    </Campo>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.85 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  botonRedondo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chico: { color: colores.textoSecundario, fontSize: 13 },
  titulo: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  contenido: { padding: 16, gap: 16 },
  fila: { flexDirection: 'row', gap: 10 },
  campo: { gap: 8 },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  subtitulo: { color: colores.texto, fontSize: 17, fontWeight: '800', marginTop: 4 },
  ayuda: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  error: { color: colores.acentoSuave, fontSize: 13, fontWeight: '600' },
  entrada: {
    height: 52,
    borderRadius: radios.medio,
    borderWidth: 1.5,
    borderColor: colores.tarjeta,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: 16,
    color: colores.texto,
    fontSize: 17,
    fontWeight: '700',
  },
  entradaError: { borderColor: colores.acento },
  entradaNumero: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radios.medio,
    borderWidth: 1.5,
    borderColor: colores.tarjeta,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: 12,
    gap: 4,
  },
  numero: { flex: 1, color: colores.texto, fontSize: 18, fontWeight: '800', padding: 0 },
  unidad: { color: colores.textoSecundario, fontSize: 14 },
  selector: { flexDirection: 'row', backgroundColor: colores.tarjeta, borderRadius: 14, padding: 4 },
  opcion: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  opcionActiva: { backgroundColor: colores.texto },
  textoOpcion: { color: colores.textoSecundario, fontSize: 15, fontWeight: '700' },
  textoOpcionActiva: { color: colores.textoSobreAcento },
  codigo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boton: {
    height: 56,
    borderRadius: radios.pill,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  textoBoton: { color: colores.texto, fontSize: 17, fontWeight: '800' },
});
