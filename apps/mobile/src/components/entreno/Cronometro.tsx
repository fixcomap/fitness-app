import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useAhora } from '../../hooks/useAhora';
import { formatearCronometro } from '../../lib/entreno/resumen';

// Tiempo desde `inicio`. Tiene su propio reloj para que la pantalla no se vuelva
// a dibujar entera cada segundo.
export function Cronometro({ inicio, style }: { inicio: string; style?: StyleProp<TextStyle> }) {
  const ahora = useAhora(1000);
  return (
    <Text style={style} accessibilityLabel="Tiempo total">
      {formatearCronometro(ahora.getTime() - Date.parse(inicio))}
    </Text>
  );
}
