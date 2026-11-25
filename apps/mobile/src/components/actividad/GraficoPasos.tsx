import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as TextoSvg } from 'react-native-svg';

import { etiquetaMiles, inicialDia } from '../../lib/actividad/calculos';
import type { DiaSemana } from '../../lib/actividad/semana';
import { colores } from '../../theme/tema';

const ALTO = 150;
const ALTO_VACIO = 6; // barrita de los días que todavía no llegaron o sin pasos
const ESPACIO = 10;
const COLOR_PASADO = '#5A5656';
const COLOR_META = '#F2F2F2';

// Barras de lunes a domingo: hoy en rojo, días con la meta cumplida en blanco,
// el resto en gris, y una línea punteada en la meta.
export function GraficoPasos({ dias, meta }: { dias: readonly DiaSemana[]; meta: number }) {
  const [ancho, setAncho] = useState(0);
  const maximo = Math.max(meta * 1.2, ...dias.map((d) => d.pasos));
  const anchoBarra = ancho > 0 ? (ancho - ESPACIO * (dias.length - 1)) / dias.length : 0;
  const y = (pasos: number) => ALTO - (pasos / maximo) * ALTO;
  const yMeta = y(meta);

  return (
    <View
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Pasos de la semana: ${dias.map((d) => (d.futuro ? '' : `${inicialDia(d.fecha)} ${d.pasos}`)).filter(Boolean).join(', ')}`}
    >
      {ancho > 0 && (
        <Svg width={ancho} height={ALTO}>
          {dias.map((d, i) => {
            const x = i * (anchoBarra + ESPACIO);
            if (d.futuro || d.pasos <= 0) {
              return <Rect key={i} x={x} y={ALTO - ALTO_VACIO} width={anchoBarra} height={ALTO_VACIO} rx={3} fill={colores.pista} />;
            }
            const alto = Math.max(ALTO - y(d.pasos), ALTO_VACIO);
            const color = d.esHoy ? colores.acento : d.pasos >= meta ? COLOR_META : COLOR_PASADO;
            return <Rect key={i} x={x} y={ALTO - alto} width={anchoBarra} height={alto} rx={9} fill={color} />;
          })}
          <Line x1={0} x2={ancho} y1={yMeta} y2={yMeta} stroke="#6A6A6A" strokeWidth={1} strokeDasharray="3 3" />
          <TextoSvg x={ancho} y={yMeta - 5} fill={colores.textoSecundario} fontSize={11} fontWeight="700" textAnchor="end">
            {etiquetaMiles(meta)}
          </TextoSvg>
        </Svg>
      )}
      <View style={styles.etiquetas}>
        {dias.map((d, i) => (
          <Text key={i} style={[styles.dia, d.esHoy && styles.hoy]}>
            {inicialDia(d.fecha)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  etiquetas: { flexDirection: 'row', gap: ESPACIO, marginTop: 10 },
  dia: { flex: 1, textAlign: 'center', color: colores.textoSecundario, fontSize: 12, fontWeight: '600' },
  hoy: { color: colores.texto, fontWeight: '800' },
});
