import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Ejercicio } from '../../data/tipos';
import { partesProgresion, ultimaVez, usaPeso, type ParteTexto } from '../../lib/entreno/progresion';
import type { EjercicioEnCurso, SerieEnCurso, SesionGuardada } from '../../lib/entreno/tipos';
import { coloresSesion as c, medidasSesion as m } from './estiloSesion';
import { Miniatura } from './Miniatura';
import { TablaSeries } from './TablaSeries';

interface PaginaEjercicioProps {
  ejercicio: EjercicioEnCurso;
  datos: Ejercicio | undefined; // del catálogo (puede faltar si se sacó)
  indice: number;
  total: number;
  historial: readonly SesionGuardada[];
  marcadas: ReadonlySet<number>;
  siguiente: string | null; // "Elevaciones laterales · 3×12", o null si es el último
  espacioAbajo: number; // lo que tapa la barra de descanso
  onEditar: (serie: number, cambios: Partial<Pick<SerieEnCurso, 'kg' | 'reps'>>) => void;
  onTildar: (serie: number) => void;
  onBorrar: (serie: number) => void;
  onAgregar: () => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  onTerminar: () => void;
  onVerTecnica: () => void; // abre la hoja con la info del ejercicio
}

// Un ejercicio de la sesión en curso: encabezado, progresión, series y tarjetas
// para ir al anterior o al siguiente. Es una página del deslizador.
export function PaginaEjercicio({
  ejercicio,
  datos,
  indice,
  total,
  historial,
  marcadas,
  siguiente,
  espacioAbajo,
  onEditar,
  onTildar,
  onBorrar,
  onAgregar,
  onAnterior,
  onSiguiente,
  onTerminar,
  onVerTecnica,
}: PaginaEjercicioProps) {
  const ultima = useMemo(() => ultimaVez(historial, ejercicio.ejercicioId), [historial, ejercicio.ejercicioId]);
  const conPeso = datos ? usaPeso(datos.equipo) : true;
  const aviso = datos ? partesProgresion(ultima, datos.equipo, new Date()) : null;
  const esPrimero = indice === 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.contenido, { paddingBottom: espacioAbajo + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Tocando la foto o el nombre se abre la técnica, sin salir de la sesión. */}
      <Pressable
        onPress={onVerTecnica}
        disabled={!datos}
        style={({ pressed }) => [styles.ejercicio, pressed && styles.presionado]}
        accessibilityRole="button"
        accessibilityHint="Muestra la técnica, los músculos y el video"
      >
        {datos && <Miniatura ejercicio={datos} tamano={m.miniatura} radio={14} />}
        <View style={styles.flex}>
          <Text style={styles.contador}>
            Ejercicio {indice + 1} de {total}
            {datos && <Text style={styles.verTecnica}> · Ver técnica</Text>}
          </Text>
          <Text style={styles.nombreEjercicio}>{datos?.nombre ?? 'Ejercicio'}</Text>
        </View>
      </Pressable>

      {aviso && (
        <View style={styles.aviso}>
          <Ionicons name="trending-up" size={22} color={c.rojo} />
          <Text style={styles.textoAviso}>
            {aviso.map((parte, i) => (
              <Text key={i} style={ESTILO_PARTE[parte.estilo]}>
                {parte.texto}
              </Text>
            ))}
          </Text>
        </View>
      )}

      <TablaSeries
        series={ejercicio.series}
        anteriores={ultima?.ejercicio.series ?? []}
        conPeso={conPeso}
        marcadas={marcadas}
        onEditar={onEditar}
        onTildar={onTildar}
        onBorrar={onBorrar}
        onAgregar={onAgregar}
      />

      {/* Anterior y siguiente (también se puede deslizar hacia los costados) */}
      <View style={styles.navegacion}>
        <Pressable
          onPress={onAnterior}
          disabled={esPrimero}
          style={({ pressed }) => [styles.tarjeta, styles.anterior, esPrimero && styles.deshabilitado, pressed && styles.presionado]}
          accessibilityRole="button"
          accessibilityLabel="Ejercicio anterior"
          accessibilityState={{ disabled: esPrimero }}
        >
          <Ionicons name="chevron-back" size={18} color={c.textoTenue} />
          <Text style={styles.etiqueta}>Anterior</Text>
        </Pressable>
        <Pressable
          onPress={siguiente ? onSiguiente : onTerminar}
          style={({ pressed }) => [styles.tarjeta, styles.siguiente, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <View style={styles.flex}>
            <Text style={styles.etiqueta}>{siguiente ? 'Siguiente' : 'Último ejercicio'}</Text>
            <Text style={styles.tituloTarjeta} numberOfLines={1}>
              {siguiente ?? 'Terminar sesión'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textoTenue} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: m.margen, paddingTop: 14, gap: 18 },
  ejercicio: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contador: { color: c.textoTenue, fontSize: 13 },
  verTecnica: { color: c.rojoSuave, fontWeight: '700' },
  nombreEjercicio: { color: c.blanco, fontSize: 26, fontWeight: '900', lineHeight: 30, letterSpacing: -0.5 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.avisoFondo,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textoAviso: { flex: 1, color: c.blanco, fontSize: 15, lineHeight: 21 },
  navegacion: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tarjeta: { backgroundColor: c.superficie, borderRadius: 18, paddingVertical: 14 },
  anterior: { width: 76, alignItems: 'center', justifyContent: 'center', gap: 2 },
  siguiente: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  etiqueta: { color: c.textoTenue, fontSize: 13 },
  tituloTarjeta: { color: c.blanco, fontSize: 16, fontWeight: '800', marginTop: 2 },
  deshabilitado: { opacity: 0.35 },
  presionado: { opacity: 0.8 },
});

const estilosParte = StyleSheet.create({
  normal: {},
  fuerte: { fontWeight: '800' },
  acento: { fontWeight: '800', color: c.rojoSuave },
});

const ESTILO_PARTE: Record<ParteTexto['estilo'], object> = estilosParte;
