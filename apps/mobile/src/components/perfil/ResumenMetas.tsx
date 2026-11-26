import { StyleSheet, Text, View } from 'react-native';

import { formatearNumero } from '../../lib/formato';
import type { MetasNutricion } from '../../lib/perfil';
import { colores, espacios, radios } from '../../theme/tema';

// Objetivo diario de kcal y metas de macros (onboarding y Perfil).
export function ResumenMetas({ metas, grande = false }: { metas: MetasNutricion; grande?: boolean }) {
  return (
    <View style={styles.tarjeta}>
      <Text style={styles.etiqueta}>Objetivo diario</Text>
      <Text style={[styles.kcal, grande && styles.kcalGrande]}>
        {formatearNumero(metas.kcal)} <Text style={styles.unidad}>kcal</Text>
      </Text>
      <View style={styles.macros}>
        <Macro nombre="Proteínas" gramos={metas.proteinas} />
        <Macro nombre="Carbos" gramos={metas.carbos} />
        <Macro nombre="Grasas" gramos={metas.grasas} />
      </View>
    </View>
  );
}

function Macro({ nombre, gramos }: { nombre: string; gramos: number }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.gramos}>{formatearNumero(gramos)} g</Text>
      <Text style={styles.etiqueta}>{nombre}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.grande, padding: espacios.m + 4, gap: espacios.s },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '600' },
  kcal: { color: colores.texto, fontSize: 30, fontWeight: '800' },
  kcalGrande: { fontSize: 48 },
  unidad: { color: colores.textoSecundario, fontSize: 18, fontWeight: '700' },
  macros: { flexDirection: 'row', gap: espacios.s, marginTop: espacios.s },
  macro: {
    flex: 1,
    backgroundColor: colores.tarjetaElevada,
    borderRadius: radios.medio,
    padding: espacios.s + 4,
    gap: 2,
  },
  gramos: { color: colores.texto, fontSize: 18, fontWeight: '800' },
});
