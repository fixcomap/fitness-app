import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAhora } from '../../hooks/useAhora';
import { formatearCronometro } from '../../lib/entreno/resumen';
import { AJUSTE_DESCANSO_S, fraccionDescanso, segundosRestantes } from '../../lib/entreno/sesion';
import type { Descanso } from '../../lib/entreno/tipos';
import { AnilloProgreso } from '../progreso/AnilloProgreso';
import { coloresSesion as c, medidasSesion as m } from './estiloSesion';

interface BarraDescansoProps {
  descanso: Descanso | null; // null: el descanso ya terminó ("¡Dale!")
  onAjustar: (deltaS: number) => void;
  onSaltar: () => void;
}

const GROSOR_ANILLO = 4;
const PUNTO = 8;

// Temporizador de descanso flotante: anillo, cuenta regresiva, −15, +15 y Saltar.
// Al terminar queda "¡Dale!" hasta la próxima serie o hasta tocar Saltar.
// Tiene su propio reloj para no redibujar la pantalla entera.
export function BarraDescanso({ descanso, onAjustar, onSaltar }: BarraDescansoProps) {
  const ahora = useAhora(250);
  const segundos = segundosRestantes({ descanso }, ahora);
  const terminado = !descanso || segundos === 0;
  const porcentaje = terminado ? 0 : fraccionDescanso({ descanso }, ahora) * 100;

  return (
    <View style={styles.barra} accessibilityLiveRegion="polite">
      <View>
        <AnilloProgreso porcentaje={porcentaje} tamano={m.anillo} grosor={GROSOR_ANILLO} colorPista={c.pistaAnillo} color={c.rojo} />
        {/* Punta del anillo, arriba: queda sola cuando el descanso terminó. */}
        <View style={styles.punto} />
      </View>

      <View style={styles.textos}>
        <Text style={styles.etiqueta}>{terminado ? 'Descanso\nterminado' : 'Descanso'}</Text>
        <Text style={styles.grande} numberOfLines={1} adjustsFontSizeToFit>
          {terminado ? '¡Dale!' : formatearCronometro(segundos * 1000)}
        </Text>
      </View>

      <BotonRedondo
        texto={`−${AJUSTE_DESCANSO_S}`}
        etiqueta={`Restar ${AJUSTE_DESCANSO_S} segundos`}
        deshabilitado={terminado}
        onPress={() => onAjustar(-AJUSTE_DESCANSO_S)}
      />
      <BotonRedondo
        texto={`+${AJUSTE_DESCANSO_S}`}
        etiqueta={`Sumar ${AJUSTE_DESCANSO_S} segundos`}
        deshabilitado={terminado}
        onPress={() => onAjustar(AJUSTE_DESCANSO_S)}
      />
      <Pressable
        onPress={onSaltar}
        style={({ pressed }) => [styles.saltar, pressed && styles.presionado]}
        accessibilityRole="button"
        accessibilityLabel={terminado ? 'Cerrar aviso de descanso' : 'Saltar descanso'}
      >
        <Text style={styles.textoSaltar}>Saltar</Text>
      </Pressable>
    </View>
  );
}

function BotonRedondo({
  texto,
  etiqueta,
  deshabilitado,
  onPress,
}: {
  texto: string;
  etiqueta: string;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [styles.redondo, deshabilitado && styles.deshabilitado, pressed && styles.presionado]}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
    >
      <Text style={styles.textoRedondo}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.superficieAlta,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 18,
  },
  punto: {
    position: 'absolute',
    top: GROSOR_ANILLO / 2 - PUNTO / 2,
    left: m.anillo / 2 - PUNTO / 2,
    width: PUNTO,
    height: PUNTO,
    borderRadius: PUNTO / 2,
    backgroundColor: c.rojo,
  },
  textos: { flex: 1, marginLeft: 6 },
  etiqueta: { color: c.textoTenue, fontSize: 13, lineHeight: 18 },
  grande: { color: c.blanco, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  redondo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.botonDescanso,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoRedondo: { color: c.blanco, fontSize: 13, fontWeight: '800' },
  saltar: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: c.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSaltar: { color: c.textoSobreBlanco, fontSize: 15, fontWeight: '800' },
  deshabilitado: { opacity: 0.45 },
  presionado: { opacity: 0.8 },
});
