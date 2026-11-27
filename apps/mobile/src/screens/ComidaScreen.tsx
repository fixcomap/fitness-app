import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HojaPorcion } from '../components/comida/HojaPorcion';
import { MenuAgregar } from '../components/comida/MenuAgregar';
import { BarraProgreso } from '../components/progreso/Barras';
import { useComidas } from '../estado/Comidas';
import { useDatosDelDia } from '../estado/DatosDelDia';
import { useEntreno } from '../estado/Entreno';
import { useCoachHabilitado } from '../hooks/useCoachHabilitado';
import {
  diaComidas,
  etiquetaDia,
  NOMBRE_COMIDA,
  nutrientesRegistro,
  restarDias,
  type Comida,
  type RegistroComida,
  type SeccionDiario,
} from '../lib/comida/diario';
import { esAproximado } from '../lib/comida/alimentos';
import { FUENTE_CORREGIDA } from '../lib/comida/aproximados';
import { detalleCantidad } from '../lib/comida/porciones';
import { kcalEntrenoDelDia } from '../lib/entreno/resumen';
import { formatearNumero } from '../lib/formato';
import { claveDia } from '../lib/pasosManuales';
import { metasNutricion } from '../lib/perfil';
import { armarResumenDia, kcalRestantes, porcentaje, type Meta } from '../lib/resumenDia';
import { colores, radios } from '../theme/tema';

// Los macros, como en Inicio: de más claro a más oscuro.
const COLOR_MACRO = { proteinas: '#F2F2F2', carbos: '#BDBDBD', grasas: '#8A8A8A' } as const;

interface ComidaScreenProps {
  onBuscar: (dia: string, comida: Comida) => void;
  onEscanear: (dia: string, comida: Comida) => void;
  onFoto: (dia: string, comida: Comida) => void;
}

// Diario del día: lo comido contra el objetivo (+ la actividad de ese día) y las 5 comidas.
export function ComidaScreen({ onBuscar, onEscanear, onFoto }: ComidaScreenProps) {
  const hoy = claveDia(new Date());
  const [dia, setDia] = useState(hoy);
  const [menu, setMenu] = useState<Comida | null>(null);
  const [editando, setEditando] = useState<RegistroComida | null>(null);
  // Desplegadas a mano; si no, se despliegan las que tienen algo.
  const [desplegadas, setDesplegadas] = useState<Partial<Record<Comida, boolean>>>({});

  const { registros, editar, borrar, corregirValores } = useComidas();
  const { perfil, config, totalDelDia } = useDatosDelDia();
  const { historial } = useEntreno();
  // La foto con IA es premium, con el mismo desbloqueo de desarrollo que el coach.
  const { habilitado: fotoHabilitada, desbloquearDev } = useCoachHabilitado();

  const delDia = useMemo(() => diaComidas(registros, dia), [registros, dia]);
  const { kcal, macros } = useMemo(
    () =>
      armarResumenDia({
        metaPasos: config.metaPasos,
        pasosAutomaticos: totalDelDia(dia).pasos,
        pasosManuales: 0,
        minutos: { hoy: 0, semana: 0 },
        perfil,
        kcalEntreno: kcalEntrenoDelDia(historial, dia),
        metas: metasNutricion(perfil),
        comido: delDia.totales,
      }),
    [config.metaPasos, totalDelDia, dia, perfil, historial, delDia.totales],
  );
  const disponible = kcal.objetivo + kcal.actividad;
  const restantes = kcalRestantes(kcal);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <Text style={styles.titulo} accessibilityRole="header">
            Comida
          </Text>
          <View style={styles.navegacion}>
            <BotonDia icono="chevron-back" etiqueta="Día anterior" onPress={() => setDia(restarDias(dia, 1))} />
            <Text style={styles.dia}>{etiquetaDia(dia, hoy)}</Text>
            <BotonDia
              icono="chevron-forward"
              etiqueta="Día siguiente"
              deshabilitado={dia >= hoy}
              onPress={() => setDia(restarDias(dia, -1))}
            />
          </View>
        </View>

        {/* Resumen */}
        <View style={styles.tarjeta}>
          <View style={styles.filaKcal}>
            <Text style={styles.kcalComidas}>
              {formatearNumero(kcal.comidas)}
              <Text style={styles.kcalObjetivo}> / {formatearNumero(disponible)} kcal</Text>
            </Text>
            <Text style={[styles.quedan, restantes === 0 && styles.pasado]}>
              {restantes > 0
                ? `Te quedan ${formatearNumero(restantes)}`
                : `Pasaste ${formatearNumero(kcal.comidas - disponible)}`}
            </Text>
          </View>
          <BarraProgreso porcentaje={porcentaje(kcal.comidas, disponible)} />
          {kcal.actividad > 0 && (
            <Text style={styles.nota}>
              Objetivo {formatearNumero(kcal.objetivo)} + {formatearNumero(kcal.actividad)} de actividad
            </Text>
          )}
          <View style={styles.macros}>
            <Macro nombre="Proteínas" meta={macros.proteinas} color={COLOR_MACRO.proteinas} />
            <Macro nombre="Carbos" meta={macros.carbos} color={COLOR_MACRO.carbos} />
            <Macro nombre="Grasas" meta={macros.grasas} color={COLOR_MACRO.grasas} />
          </View>
        </View>

        {delDia.secciones.map((s) => (
          <Seccion
            key={s.comida}
            seccion={s}
            desplegada={desplegadas[s.comida] ?? s.registros.length > 0}
            onAlternar={() => setDesplegadas((d) => ({ ...d, [s.comida]: !(d[s.comida] ?? s.registros.length > 0) }))}
            onAgregar={() => setMenu(s.comida)}
            onTocar={setEditando}
          />
        ))}
      </ScrollView>

      <MenuAgregar
        comida={menu}
        onBuscar={(c) => onBuscar(dia, c)}
        onEscanear={(c) => onEscanear(dia, c)}
        onFoto={(c) => onFoto(dia, c)}
        fotoHabilitada={fotoHabilitada}
        onDesbloquearDev={desbloquearDev}
        onCerrar={() => setMenu(null)}
      />

      <HojaPorcion
        abierta={editando && { alimento: editando.alimento, cantidad: editando.cantidad }}
        textoBoton="Guardar cambios"
        onConfirmar={(_, cantidad) => {
          if (editando) editar(editando.id, { cantidad });
          setEditando(null);
        }}
        onBorrar={() => {
          if (editando) borrar(editando.id);
          setEditando(null);
        }}
        onCorregirValores={(valores) => {
          if (!editando) return;
          corregirValores(editando.alimento.id, valores);
          // La hoja sigue abierta con los valores nuevos.
          setEditando({ ...editando, alimento: { ...editando.alimento, ...valores, fuente: FUENTE_CORREGIDA } });
        }}
        onCerrar={() => setEditando(null)}
      />
    </SafeAreaView>
  );
}

function BotonDia({
  icono,
  etiqueta,
  deshabilitado = false,
  onPress,
}: {
  icono: 'chevron-back' | 'chevron-forward';
  etiqueta: string;
  deshabilitado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      hitSlop={6}
      style={[styles.botonDia, deshabilitado && styles.apagado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
    >
      <Ionicons name={icono} size={18} color={colores.texto} />
    </Pressable>
  );
}

function Macro({ nombre, meta, color }: { nombre: string; meta: Meta; color: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.nombreMacro}>{nombre}</Text>
      <Text style={styles.valorMacro}>
        <Text style={styles.negrita}>{formatearNumero(meta.actual)}</Text> / {formatearNumero(meta.meta)} g
      </Text>
      <BarraProgreso porcentaje={porcentaje(meta.actual, meta.meta)} color={color} />
    </View>
  );
}

function Seccion({
  seccion,
  desplegada,
  onAlternar,
  onAgregar,
  onTocar,
}: {
  seccion: SeccionDiario;
  desplegada: boolean;
  onAlternar: () => void;
  onAgregar: () => void;
  onTocar: (r: RegistroComida) => void;
}) {
  const nombre = NOMBRE_COMIDA[seccion.comida];
  return (
    <View style={styles.tarjetaSeccion}>
      <View style={styles.filaSeccion}>
        <Pressable
          onPress={onAlternar}
          style={styles.tituloSeccion}
          accessibilityRole="button"
          accessibilityState={{ expanded: desplegada }}
          accessibilityLabel={`${nombre}, ${seccion.totales.kcal} kcal`}
        >
          <Ionicons name={desplegada ? 'chevron-down' : 'chevron-forward'} size={18} color={colores.textoSecundario} />
          <Text style={styles.nombreSeccion}>{nombre}</Text>
          <Text style={styles.kcalSeccion}>{formatearNumero(seccion.totales.kcal)} kcal</Text>
        </Pressable>
        <Pressable
          onPress={onAgregar}
          hitSlop={6}
          style={({ pressed }) => [styles.mas, pressed && styles.presionado]}
          accessibilityRole="button"
          accessibilityLabel={`Agregar a ${nombre.toLowerCase()}`}
        >
          <Ionicons name="add" size={24} color={colores.texto} />
        </Pressable>
      </View>

      {desplegada &&
        (seccion.registros.length === 0 ? (
          <Text style={styles.vacio}>Todavía nada. Tocá + para agregar.</Text>
        ) : (
          seccion.registros.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => onTocar(r)}
              style={({ pressed }) => [styles.item, pressed && styles.presionado]}
              accessibilityRole="button"
              accessibilityHint="Editar la cantidad o borrar"
            >
              <View style={styles.flex}>
                <Text style={styles.nombreItem} numberOfLines={1}>
                  {r.alimento.nombre}
                </Text>
                <View style={styles.filaDetalle}>
                  <Text style={styles.detalleItem}>{detalleCantidad(r.alimento, r.cantidad)}</Text>
                  {esAproximado(r.alimento) && (
                    <Text style={styles.sello} accessibilityLabel="Valores aproximados">
                      aproximado
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.kcalItem}>{formatearNumero(nutrientesRegistro(r).kcal)}</Text>
            </Pressable>
          ))
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  flex: { flex: 1 },
  presionado: { opacity: 0.7 },
  apagado: { opacity: 0.35 },
  contenido: { padding: 16, paddingBottom: 120, gap: 12 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  titulo: { color: colores.texto, fontSize: 32, fontWeight: '800' },
  navegacion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  botonDia: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dia: { color: colores.texto, fontSize: 15, fontWeight: '700' },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: 20, gap: 12 },
  filaKcal: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  kcalComidas: { color: colores.texto, fontSize: 38, fontWeight: '800', flexShrink: 1 },
  kcalObjetivo: { color: colores.textoSecundario, fontSize: 15, fontWeight: '600' },
  quedan: { color: colores.acentoSuave, fontSize: 14, fontWeight: '800' },
  pasado: { color: colores.acento },
  nota: { color: colores.textoSecundario, fontSize: 12 },
  macros: { flexDirection: 'row', gap: 16, marginTop: 4 },
  macro: { flex: 1, gap: 4 },
  nombreMacro: { color: colores.textoSecundario, fontSize: 13 },
  valorMacro: { color: colores.textoSecundario, fontSize: 14 },
  negrita: { color: colores.texto, fontWeight: '800' },
  tarjetaSeccion: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filaSeccion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloSeccion: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  nombreSeccion: { flex: 1, color: colores.texto, fontSize: 19, fontWeight: '800' },
  kcalSeccion: { color: colores.textoSecundario, fontSize: 14 },
  mas: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: { color: colores.textoSecundario, fontSize: 14, paddingVertical: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  nombreItem: { color: colores.texto, fontSize: 16, fontWeight: '700' },
  detalleItem: { color: colores.textoSecundario, fontSize: 13 },
  filaDetalle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  sello: {
    color: colores.oro,
    backgroundColor: colores.oroFondo,
    borderColor: colores.oroBorde,
    borderWidth: 1,
    borderRadius: radios.pill,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  kcalItem: { color: colores.texto, fontSize: 16, fontWeight: '800' },
});
