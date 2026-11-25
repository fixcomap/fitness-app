import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PERFIL_EJEMPLO } from '../lib/perfil';
import { InicioScreen } from '../screens/InicioScreen';
import { PantallaTitulo } from '../screens/PantallaTitulo';
import { colores } from '../theme/tema';
import { EntrenoStack } from './EntrenoStack';

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
  return (
    <InicioScreen
      onEmpezarEntreno={() => navigation.navigate('Entreno')}
      onAbrirCoach={() => navigation.navigate('Coach')}
    />
  );
}

const Comida = () => <PantallaTitulo titulo="Comida" />;
const Actividad = () => <PantallaTitulo titulo="Actividad" />;
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
          <IconoTab nombre={ICONOS[route.name]} color={color} bloqueado={route.name === 'Coach' && !PERFIL_EJEMPLO.esPremium} />
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={InicioRuta} />
      <Tab.Screen name="Entreno" component={EntrenoStack} />
      <Tab.Screen name="Comida" component={Comida} />
      <Tab.Screen name="Actividad" component={Actividad} />
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
