import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';

import { useEntreno } from '../estado/Entreno';
import { CatalogoScreen } from '../screens/CatalogoScreen';
import { DetalleEjercicioScreen } from '../screens/DetalleEjercicioScreen';
import { HistorialSesionesScreen } from '../screens/HistorialSesionesScreen';
import { RutinasScreen } from '../screens/RutinasScreen';
import { colores } from '../theme/tema';
import { useNavegacionRaiz } from './tiposRaiz';

export type EntrenoStackParamList = {
  Catalogo: undefined;
  Detalle: { id: string };
  Rutinas: undefined;
  Historial: undefined;
};

const Stack = createNativeStackNavigator<EntrenoStackParamList>();

function CatalogoRuta({ navigation }: NativeStackScreenProps<EntrenoStackParamList, 'Catalogo'>) {
  const { armada, enCurso } = useEntreno();
  // Las pantallas de la sesión están en la navegación de arriba (Raiz).
  const raiz = useNavegacionRaiz();
  return (
    <CatalogoScreen
      onAbrirEjercicio={(e) => navigation.navigate('Detalle', { id: e.id })}
      onAbrirRutinas={() => navigation.navigate('Rutinas')}
      sesion={{ ejercicios: armada.ejercicios.length, enCurso: enCurso !== null }}
      onAbrirSesion={() => raiz.navigate(enCurso ? 'SesionEnCurso' : 'SesionArmada')}
    />
  );
}

function RutinasRuta({ navigation }: NativeStackScreenProps<EntrenoStackParamList, 'Rutinas'>) {
  const { empezarRutina } = useEntreno();
  const raiz = useNavegacionRaiz();
  return (
    <RutinasScreen
      onVolver={() => navigation.goBack()}
      onEmpezar={(rutina) => {
        if (empezarRutina(rutina)) raiz.navigate('SesionEnCurso');
      }}
      onSeguirSesion={() => raiz.navigate('SesionEnCurso')}
      onEditar={(rutina) => raiz.navigate('EditarRutina', { id: rutina.id })}
      onNueva={(dia) => raiz.navigate('EditarRutina', { dia })}
      onVerHistorial={() => navigation.navigate('Historial')}
    />
  );
}

function HistorialRuta({ navigation }: NativeStackScreenProps<EntrenoStackParamList, 'Historial'>) {
  return <HistorialSesionesScreen onVolver={() => navigation.goBack()} />;
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
      <Stack.Screen name="Rutinas" component={RutinasRuta} options={{ headerShown: false }} />
      <Stack.Screen name="Historial" component={HistorialRuta} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
