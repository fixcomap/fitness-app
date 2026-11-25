import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';

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
  Inicio: 'home',
  Entreno: 'barbell',
  Comida: 'restaurant',
  Actividad: 'pulse',
  Coach: 'chatbubbles',
};

const Tab = createBottomTabNavigator<TabsParamList>();

const Inicio = () => <PantallaTitulo titulo="Inicio" />;
const Comida = () => <PantallaTitulo titulo="Comida" />;
const Actividad = () => <PantallaTitulo titulo="Actividad" />;
const Coach = () => <PantallaTitulo titulo="Coach" />;

export function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Entreno"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarStyle: { backgroundColor: colores.fondo, borderTopColor: colores.borde },
        tabBarLabelStyle: { fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONOS[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Inicio" component={Inicio} />
      <Tab.Screen name="Entreno" component={EntrenoStack} />
      <Tab.Screen name="Comida" component={Comida} />
      <Tab.Screen name="Actividad" component={Actividad} />
      <Tab.Screen name="Coach" component={Coach} />
    </Tab.Navigator>
  );
}
