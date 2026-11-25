import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colores } from '../../theme/tema';

interface AnilloProgresoProps {
  porcentaje: number; // 0 a 100, arranca arriba y avanza en sentido horario
  tamano: number;
  grosor: number;
  color?: string;
  colorPista?: string;
  children?: ReactNode; // lo que va en el centro
}

export function AnilloProgreso({
  porcentaje,
  tamano,
  grosor,
  color = colores.acento,
  colorPista = colores.pista,
  children,
}: AnilloProgresoProps) {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const centro = tamano / 2;
  const p = Math.max(0, Math.min(100, porcentaje));

  return (
    <View style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano}>
        <Circle cx={centro} cy={centro} r={radio} stroke={colorPista} strokeWidth={grosor} fill="none" />
        {p > 0 && (
          <Circle
            cx={centro}
            cy={centro}
            r={radio}
            stroke={color}
            strokeWidth={grosor}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circunferencia} ${circunferencia}`}
            strokeDashoffset={circunferencia * (1 - p / 100)}
            transform={`rotate(-90 ${centro} ${centro})`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centro]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
});
