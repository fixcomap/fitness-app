import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';

import { CatalogoScreen } from '../screens/CatalogoScreen';
import { DetalleEjercicioScreen } from '../screens/DetalleEjercicioScreen';
import { colores } from '../theme/tema';

export type EntrenoStackParamList = {
  Catalogo: undefined;
  Detalle: { id: string };
};

const Stack = createNativeStackNavigator<EntrenoStackParamList>();

function CatalogoRuta({ navigation }: NativeStackScreenProps<EntrenoStackParamList, 'Catalogo'>) {
  return <CatalogoScreen onAbrirEjercicio={(e) => navigation.navigate('Detalle', { id: e.id })} />;
}

function DetalleRuta({ route }: NativeStackScreenProps<EntrenoStackParamList, 'Detalle'>) {
  return <DetalleEjercicioScreen id={route.params.id} />;
}

export function EntrenoStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="Catalogo" component={CatalogoRuta} options={{ headerShown: false }} />
      <Stack.Screen name="Detalle" component={DetalleRuta} options={{ title: '', headerBackTitle: 'Entreno' }} />
    </Stack.Navigator>
  );
}
