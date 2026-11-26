import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEntreno } from '../estado/Entreno';
import { usePerfilActual } from '../estado/Perfil';
import { ActividadScreen } from '../screens/ActividadScreen';
import { ComidaScreen } from '../screens/ComidaScreen';
import { InicioScreen } from '../screens/InicioScreen';
import { PantallaTitulo } from '../screens/PantallaTitulo';
import { colores } from '../theme/tema';
import { EntrenoStack } from './EntrenoStack';
import { useNavegacionRaiz } from './tiposRaiz';

export type TabsParamList = {
  Inicio: undefined;
  Entreno: undefined;
  Comida: undefined;
  Actividad: undefined;
  Coach: undefined;
};

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

const ICONOS: Record<keyof TabsParamList, NombreIcono> = {
  Inicio: 'home-outline',
  Entreno: 'barbell-outline',
  Comida: 'restaurant-outline',
  Actividad: 'pulse-outline',
  Coach: 'chatbubble-outline',
};

const Tab = createBottomTabNavigator<TabsParamList>();

function InicioRuta({ navigation }: BottomTabScreenProps<TabsParamList, 'Inicio'>) {
  const { rutinas, empezarRutina } = useEntreno();
  // Las pantallas de la sesión están en la navegación de arriba (Raiz).
  const raiz = useNavegacionRaiz();
  return (
    <InicioScreen
      onEmpezarEntreno={(entreno) => {
        const rutina = entreno.rutinaId ? rutinas.find((r) => r.id === entreno.rutinaId) : undefined;
        if (entreno.enCurso || (rutina && empezarRutina(rutina))) raiz.navigate('SesionEnCurso');
        else raiz.navigate('SesionArmada');
      }}
      onArmarSesion={() => navigation.navigate('Entreno')}
      onAbrirCoach={() => navigation.navigate('Coach')}
      onAbrirPerfil={() => raiz.navigate('Perfil')}
    />
  );
}

function ActividadRuta() {
  const raiz = useNavegacionRaiz();
  return <ActividadScreen onAbrirPerfil={() => raiz.navigate('Perfil')} />;
}

function ComidaRuta() {
  const raiz = useNavegacionRaiz();
  return (
    <ComidaScreen
      onBuscar={(dia, comida) => raiz.navigate('BuscarAlimento', { dia, comida })}
      onEscanear={(dia, comida) => raiz.navigate('EscanearCodigo', { dia, comida })}
    />
  );
}

const Coach = () => <PantallaTitulo titulo="Coach" />;

function IconoTab({ nombre, color, bloqueado }: { nombre: NombreIcono; color: string; bloqueado: boolean }) {
  return (
    <View>
      <Ionicons name={nombre} color={color} size={23} />
      {bloqueado && (
        <View style={styles.candado}>
          <Ionicons name="lock-closed" size={8} color={colores.textoSobreAcento} />
        </View>
      )}
    </View>
  );
}

export function Tabs() {
  const insets = useSafeAreaInsets();
  const perfil = usePerfilActual();
  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoSecundario,
        // Barra flotante con bordes redondeados, como en el diseño.
        tabBarStyle: [styles.barra, { marginBottom: Math.max(insets.bottom, 10) }],
        tabBarItemStyle: styles.item,
        tabBarLabelStyle: styles.etiqueta,
        tabBarIcon: ({ color }) => (
          <IconoTab nombre={ICONOS[route.name]} color={color} bloqueado={route.name === 'Coach' && !perfil.esPremium} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={InicioRuta} />
      <Tab.Screen name="Entreno" component={EntrenoStack} />
      <Tab.Screen name="Comida" component={ComidaRuta} />
      <Tab.Screen name="Actividad" component={ActividadRuta} />
      <Tab.Screen name="Coach" component={Coach} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  barra: {
    backgroundColor: colores.tarjeta,
    borderTopWidth: 0,
    borderRadius: 30,
    marginHorizontal: 12,
    height: 62,
    paddingTop: 6,
    paddingBottom: 6,
  },
  item: { paddingVertical: 2 },
  etiqueta: { fontSize: 11, fontWeight: '700' },
  candado: {
    position: 'absolute',
    top: -4,
    right: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colores.oro,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
