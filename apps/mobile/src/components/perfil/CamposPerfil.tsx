// Campos del formulario de perfil, compartidos por el onboarding y la pantalla Perfil.
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import type { Objetivo, Sexo } from '../../lib/calorias';
import {
  LIMITES,
  LUGAR_POR_DEFECTO,
  LUGARES,
  NIVEL_POR_DEFECTO,
  NIVELES,
  OBJETIVOS_ENTRENO,
  OBJETIVOS_PESO,
  SEXOS,
  type BorradorPerfil,
  type ErroresPerfil,
  type Lugar,
  type Nivel,
  type ObjetivoEntreno,
} from '../../lib/perfil';
import { colores, espacios, radios } from '../../theme/tema';

const NOMBRE_SEXO: Record<Sexo, string> = { hombre: 'Hombre', mujer: 'Mujer' };
const NOMBRE_OBJETIVO_PESO: Record<Objetivo, string> = { bajar: 'Bajar', mantener: 'Mantener', subir: 'Subir' };
const NOMBRE_OBJETIVO_ENTRENO: Record<ObjetivoEntreno, string> = { hipertrofia: 'Hipertrofia', fuerza: 'Fuerza' };
const NIVEL: Record<Nivel, { nombre: string; detalle: string }> = {
  principiante: { nombre: 'Principiante', detalle: 'Menos de 6 meses entrenando' },
  intermedio: { nombre: 'Intermedio', detalle: 'De 6 meses a 2 años' },
  avanzado: { nombre: 'Avanzado', detalle: 'Más de 2 años' },
};
const LUGAR: Record<Lugar, { nombre: string; detalle: string }> = {
  gym: { nombre: 'Gym completo', detalle: 'Barras, máquinas, poleas y todo lo demás' },
  'casa-mancuernas': { nombre: 'Casa con mancuernas', detalle: 'Mancuernas, peso corporal y bandas' },
  'peso-corporal': { nombre: 'Solo peso corporal', detalle: 'Peso corporal y bandas' },
};
const DIAS = Array.from({ length: LIMITES.diasEntrenoPorSemana.max + 1 }, (_, i) => i);

interface CamposProps {
  borrador: BorradorPerfil;
  errores: ErroresPerfil; // sólo los que hay que mostrar
  onCambiar: (cambios: Partial<BorradorPerfil>) => void;
}

// Nombre, sexo, edad, altura y peso.
export function CamposDatos({ borrador, errores, onCambiar }: CamposProps) {
  return (
    <View style={styles.grupo}>
      <Campo etiqueta="Nombre" error={errores.nombre}>
        <TextInput
          value={borrador.nombre}
          onChangeText={(nombre) => onCambiar({ nombre })}
          placeholder="¿Cómo te llamás?"
          placeholderTextColor={colores.textoSecundario}
          maxLength={LIMITES.nombre.max}
          autoCapitalize="words"
          style={[styles.entrada, errores.nombre && styles.entradaError]}
          accessibilityLabel="Nombre"
        />
      </Campo>
      <Campo etiqueta="Sexo" ayuda="Para calcular tu metabolismo." error={errores.sexo}>
        <Opciones
          opciones={SEXOS}
          nombres={NOMBRE_SEXO}
          elegida={borrador.sexo}
          onElegir={(sexo) => onCambiar({ sexo })}
        />
      </Campo>
      <View style={styles.fila}>
        <CampoNumero
          etiqueta="Edad"
          unidad="años"
          valor={borrador.edad}
          error={errores.edad}
          onCambiar={(edad) => onCambiar({ edad })}
        />
        <CampoNumero
          etiqueta="Altura"
          unidad="cm"
          valor={borrador.alturaCm}
          error={errores.alturaCm}
          onCambiar={(alturaCm) => onCambiar({ alturaCm })}
        />
        <CampoNumero
          etiqueta="Peso"
          unidad="kg"
          valor={borrador.pesoKg}
          error={errores.pesoKg}
          teclado="decimal-pad"
          onCambiar={(pesoKg) => onCambiar({ pesoKg })}
        />
      </View>
    </View>
  );
}

// Objetivo de peso, objetivo de entrenamiento y días de entreno por semana.
export function CamposObjetivos({ borrador, errores, onCambiar }: CamposProps) {
  return (
    <View style={styles.grupo}>
      <Campo etiqueta="Objetivo de peso" error={errores.objetivoPeso}>
        <Opciones
          opciones={OBJETIVOS_PESO}
          nombres={NOMBRE_OBJETIVO_PESO}
          elegida={borrador.objetivoPeso}
          onElegir={(objetivoPeso) => onCambiar({ objetivoPeso })}
        />
      </Campo>
      <Campo
        etiqueta="Objetivo de entrenamiento"
        ayuda={
          borrador.objetivo === 'fuerza'
            ? 'Menos reps y más peso en los ejercicios básicos (4 a 6).'
            : 'Reps moderadas para ganar músculo (6 a 10 en los básicos).'
        }
        error={errores.objetivo}
      >
        <Opciones
          opciones={OBJETIVOS_ENTRENO}
          nombres={NOMBRE_OBJETIVO_ENTRENO}
          elegida={borrador.objetivo}
          onElegir={(objetivo) => onCambiar({ objetivo })}
        />
      </Campo>
      <Campo etiqueta="Días de entreno por semana" ayuda="Para armar tus rutinas." error={errores.diasEntrenoPorSemana}>
        <View style={styles.dias}>
          {DIAS.map((d) => {
            const elegido = borrador.diasEntrenoPorSemana === d;
            return (
              <Pressable
                key={d}
                onPress={() => onCambiar({ diasEntrenoPorSemana: d })}
                style={[styles.dia, elegido && styles.opcionElegida]}
                accessibilityRole="radio"
                accessibilityState={{ selected: elegido }}
                accessibilityLabel={`${d} ${d === 1 ? 'día' : 'días'}`}
              >
                <Text style={[styles.textoOpcion, elegido && styles.textoOpcionElegida]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </Campo>
    </View>
  );
}

interface CampoEntrenoProps extends CamposProps {
  // En Perfil, para los perfiles de antes: avisa qué usa el coach mientras no lo elija.
  avisarSinElegir?: boolean;
}

// Cuánto hace que entrena (el coach ajusta el volumen y la complejidad).
export function CampoNivel({ borrador, errores, onCambiar, avisarSinElegir = false }: CampoEntrenoProps) {
  return (
    <Campo
      etiqueta="¿Cuánto hace que entrenás?"
      ayuda={
        avisarSinElegir && !borrador.nivel
          ? `Sin elegir: el coach usa ${NIVEL[NIVEL_POR_DEFECTO].nombre.toLowerCase()} hasta que lo elijas.`
          : undefined
      }
      error={errores.nivel}
    >
      <OpcionesConDetalle
        opciones={NIVELES}
        textos={NIVEL}
        elegida={borrador.nivel}
        onElegir={(nivel) => onCambiar({ nivel })}
      />
    </Campo>
  );
}

// Dónde entrena (el coach solo usa ejercicios con ese equipo).
export function CampoLugar({ borrador, errores, onCambiar, avisarSinElegir = false }: CampoEntrenoProps) {
  return (
    <Campo
      etiqueta="¿Dónde entrenás?"
      ayuda={
        avisarSinElegir && !borrador.lugar
          ? `Sin elegir: el coach usa ${LUGAR[LUGAR_POR_DEFECTO].nombre.toLowerCase()} hasta que lo elijas.`
          : 'El coach arma tus rutinas con el equipo que tenés.'
      }
      error={errores.lugar}
    >
      <OpcionesConDetalle
        opciones={LUGARES}
        textos={LUGAR}
        elegida={borrador.lugar}
        onElegir={(lugar) => onCambiar({ lugar })}
      />
    </Campo>
  );
}

function Campo({
  etiqueta,
  ayuda,
  error,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : (
        ayuda && <Text style={styles.ayuda}>{ayuda}</Text>
      )}
    </View>
  );
}

function CampoNumero({
  etiqueta,
  unidad,
  valor,
  error,
  teclado = 'number-pad',
  onCambiar,
}: {
  etiqueta: string;
  unidad: string;
  valor: string;
  error?: string;
  teclado?: KeyboardTypeOptions;
  onCambiar: (valor: string) => void;
}) {
  return (
    <View style={[styles.campo, styles.flex]}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <View style={[styles.entradaNumero, error && styles.entradaError]}>
        <TextInput
          value={valor}
          onChangeText={onCambiar}
          keyboardType={teclado}
          maxLength={5}
          selectTextOnFocus
          style={styles.numero}
          accessibilityLabel={`${etiqueta} en ${unidad}`}
        />
        <Text style={styles.unidad}>{unidad}</Text>
      </View>
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

function Opciones<T extends string>({
  opciones,
  nombres,
  elegida,
  onElegir,
}: {
  opciones: readonly T[];
  nombres: Record<T, string>;
  elegida: T | null;
  onElegir: (opcion: T) => void;
}) {
  return (
    <View style={styles.opciones} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const activa = o === elegida;
        return (
          <Pressable
            key={o}
            onPress={() => onElegir(o)}
            style={[styles.opcion, activa && styles.opcionElegida]}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
          >
            <Text style={[styles.textoOpcion, activa && styles.textoOpcionElegida]}>{nombres[o]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Como Opciones, pero una debajo de la otra y con una línea de detalle (para textos largos).
function OpcionesConDetalle<T extends string>({
  opciones,
  textos,
  elegida,
  onElegir,
}: {
  opciones: readonly T[];
  textos: Record<T, { nombre: string; detalle: string }>;
  elegida: T | null;
  onElegir: (opcion: T) => void;
}) {
  return (
    <View style={styles.lista} accessibilityRole="radiogroup">
      {opciones.map((o) => {
        const activa = o === elegida;
        return (
          <Pressable
            key={o}
            onPress={() => onElegir(o)}
            style={[styles.opcionLista, activa && styles.opcionElegida]}
            accessibilityRole="radio"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={`${textos[o].nombre}. ${textos[o].detalle}`}
          >
            <Text style={[styles.textoOpcion, activa && styles.textoOpcionElegida]}>{textos[o].nombre}</Text>
            <Text style={[styles.detalleOpcion, activa && styles.textoOpcionElegida]}>{textos[o].detalle}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grupo: { gap: espacios.l - 4 },
  fila: { flexDirection: 'row', gap: espacios.s + 2 },
  campo: { gap: espacios.s },
  etiqueta: { color: colores.textoSecundario, fontSize: 13, fontWeight: '700' },
  ayuda: { color: colores.textoSecundario, fontSize: 13 },
  error: { color: colores.acentoSuave, fontSize: 13, fontWeight: '600' },
  entrada: {
    height: 52,
    borderRadius: radios.medio,
    borderWidth: 1.5,
    borderColor: colores.tarjeta,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: espacios.m,
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
    paddingHorizontal: espacios.m - 4,
    gap: 4,
  },
  numero: { flex: 1, color: colores.texto, fontSize: 18, fontWeight: '800', padding: 0 },
  unidad: { color: colores.textoSecundario, fontSize: 14 },
  opciones: { flexDirection: 'row', gap: espacios.s },
  opcion: {
    flex: 1,
    height: 46,
    borderRadius: radios.pill,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opcionElegida: { backgroundColor: colores.acento },
  lista: { gap: espacios.s },
  opcionLista: {
    minHeight: 60,
    borderRadius: radios.medio,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: espacios.m,
    paddingVertical: espacios.s + 2,
    justifyContent: 'center',
    gap: 2,
  },
  detalleOpcion: { color: colores.textoSecundario, fontSize: 13 },
  textoOpcion: { color: colores.textoSecundario, fontSize: 15, fontWeight: '700' },
  textoOpcionElegida: { color: colores.texto },
  dias: { flexDirection: 'row', justifyContent: 'space-between' },
  dia: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
