import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Ejercicio } from '../../data/tipos';
import { textoProgresion, ultimaVez, usaPeso } from '../../lib/entreno/progresion';
import type { EjercicioEnCurso, SerieEnCurso, SesionGuardada } from '../../lib/entreno/tipos';
import { colores, espacios, radios } from '../../theme/tema';
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
}

// Un ejercicio de la sesión en curso: encabezado, progresión, series y botones
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
}: PaginaEjercicioProps) {
  const ultima = useMemo(() => ultimaVez(historial, ejercicio.ejercicioId), [historial, ejercicio.ejercicioId]);
  const conPeso = datos ? usaPeso(datos.equipo) : true;
  const aviso = datos ? textoProgresion(ultima, datos.equipo, new Date()) : null;
  const esPrimero = indice === 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.contenido, { paddingBottom: espacioAbajo + espacios.l }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.ejercicio}>
        {datos && <Miniatura ejercicio={datos} tamano={64} />}
        <View style={styles.flex}>
          <Text style={styles.contador}>
            Ejercicio {indice + 1} de {total}
          </Text>
          <Text style={styles.nombreEjercicio}>{datos?.nombre ?? 'Ejercicio'}</Text>
        </View>
      </View>

      {aviso && (
        <View style={styles.aviso}>
          <Ionicons name="trending-up" size={18} color={colores.acentoSuave} />
          <Text style={styles.textoAviso}>{aviso}</Text>
        </View>
      )}

      <View style={styles.tarjeta}>
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
      </View>

      {/* Anterior y siguiente (también se puede deslizar hacia los costados) */}
      <View style={styles.navegacion}>
        <Pressable
          onPress={onAnterior}
          disabled={esPrimero}
          style={({ pressed }) => [styles.botonAnterior, esPrimero && styles.deshabilitado, pressed && styles.presionado]}
          accessibilityRole="button"
          accessibilityState={{ disabled: esPrimero }}
        >
          <Ionicons name="arrow-back" size={18} color={colores.texto} />
          <Text style={styles.textoBoton}>Anterior</Text>
        </Pressable>
        <Pressable
          onPress={siguiente ? onSiguiente : onTerminar}
          style={({ pressed }) => [styles.botonSiguiente, pressed && styles.presionado]}
          accessibilityRole="button"
        >
          <Text style={styles.textoBoton} numberOfLines={1}>
            {siguiente ? `Siguiente: ${siguiente}` : 'Terminar sesión'}
          </Text>
          <Ionicons name={siguiente ? 'arrow-forward' : 'flag'} size={18} color={colores.texto} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { paddingHorizontal: espacios.m, paddingTop: espacios.s, gap: espacios.m },
  ejercicio: { flexDirection: 'row', alignItems: 'center', gap: espacios.m },
  contador: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  nombreEjercicio: { color: colores.texto, fontSize: 22, fontWeight: '800' },
  aviso: {
    flexDirection: 'row',
    gap: espacios.s,
    alignItems: 'flex-start',
    backgroundColor: colores.tarjeta,
    borderRadius: radios.medio,
    borderLeftWidth: 3,
    borderLeftColor: colores.acento,
    padding: espacios.s + 4,
  },
  textoAviso: { flex: 1, color: colores.texto, fontSize: 14, lineHeight: 20 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.s + 4 },
  navegacion: { flexDirection: 'row', gap: espacios.s },
  botonAnterior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colores.tarjetaElevada,
    borderRadius: radios.medio,
    paddingVertical: 14,
    paddingHorizontal: espacios.m,
  },
  botonSiguiente: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacios.s,
    backgroundColor: colores.acento,
    borderRadius: radios.medio,
    paddingVertical: 14,
    paddingHorizontal: espacios.m,
  },
  deshabilitado: { opacity: 0.4 },
  presionado: { opacity: 0.8 },
  textoBoton: { flexShrink: 1, color: colores.texto, fontSize: 15, fontWeight: '800' },
});
