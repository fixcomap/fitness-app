// Navegación de arriba de todo: las pestañas y, por encima, las pantallas de la
// sesión de entreno (se abren desde Inicio o desde Entreno).
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';

import { useEntreno } from '../estado/Entreno';
import { EditarRutinaScreen } from '../screens/EditarRutinaScreen';
import { PerfilScreen } from '../screens/PerfilScreen';
import { BuscarAlimentoScreen } from '../screens/BuscarAlimentoScreen';
import { CrearAlimentoScreen } from '../screens/CrearAlimentoScreen';
import { EscanearCodigoScreen } from '../screens/EscanearCodigoScreen';
import { FotoComidaScreen } from '../screens/FotoComidaScreen';
import { ResumenSesionScreen } from '../screens/ResumenSesionScreen';
import { SesionArmadaScreen } from '../screens/SesionArmadaScreen';
import { SesionEnCursoScreen } from '../screens/SesionEnCursoScreen';
import { colores } from '../theme/tema';
import { Tabs } from './Tabs';
import type { RaizParamList } from './tiposRaiz';

const Stack = createNativeStackNavigator<RaizParamList>();

// Al abrir la app con una sesión sin terminar, la retoma. Va aparte de las pestañas
// para que los cambios de la sesión (cada tecla) no las vuelvan a dibujar.
function RetomarSesion({ onRetomar }: { onRetomar: () => void }) {
  const { listo, enCurso } = useEntreno();
  const revisado = useRef(false);
  useEffect(() => {
    if (!listo || revisado.current) return;
    revisado.current = true;
    if (enCurso) onRetomar();
  }, [listo, enCurso, onRetomar]);
  return null;
}

function TabsRuta({ navigation }: NativeStackScreenProps<RaizParamList, 'Tabs'>) {
  return (
    <>
      <RetomarSesion onRetomar={() => navigation.navigate('SesionEnCurso')} />
      <Tabs />
    </>
  );
}

function SesionArmadaRuta({ navigation }: NativeStackScreenProps<RaizParamList, 'SesionArmada'>) {
  return (
    <SesionArmadaScreen
      onEmpezar={() => navigation.replace('SesionEnCurso')}
      onAgregarEjercicios={() => navigation.navigate('Tabs', { screen: 'Entreno' })}
      onCerrar={() => navigation.goBack()}
    />
  );
}

function SesionEnCursoRuta({ navigation }: NativeStackScreenProps<RaizParamList, 'SesionEnCurso'>) {
  return (
    <SesionEnCursoScreen
      onMinimizar={() => navigation.goBack()}
      onTerminada={(id) => navigation.replace('ResumenSesion', { id })}
      onDescartada={() => navigation.goBack()}
    />
  );
}

function ResumenSesionRuta({ navigation, route }: NativeStackScreenProps<RaizParamList, 'ResumenSesion'>) {
  return <ResumenSesionScreen id={route.params.id} onListo={() => navigation.goBack()} />;
}

function EditarRutinaRuta({ navigation, route }: NativeStackScreenProps<RaizParamList, 'EditarRutina'>) {
  return <EditarRutinaScreen rutinaId={route.params?.id} dia={route.params?.dia} onCerrar={() => navigation.goBack()} />;
}

function PerfilRuta({ navigation }: NativeStackScreenProps<RaizParamList, 'Perfil'>) {
  return <PerfilScreen onVolver={() => navigation.goBack()} />;
}

function BuscarAlimentoRuta({ navigation, route }: NativeStackScreenProps<RaizParamList, 'BuscarAlimento'>) {
  const { dia, comida } = route.params;
  return (
    <BuscarAlimentoScreen
      dia={dia}
      comida={comida}
      onVolver={() => navigation.goBack()}
      onEscanear={() => navigation.replace('EscanearCodigo', { dia, comida })}
      onCrear={(datos) => navigation.navigate('CrearAlimento', { dia, comida, ...datos })}
    />
  );
}

function EscanearCodigoRuta({ navigation, route }: NativeStackScreenProps<RaizParamList, 'EscanearCodigo'>) {
  const { dia, comida } = route.params;
  return (
    <EscanearCodigoScreen
      dia={dia}
      comida={comida}
      onCerrar={() => navigation.goBack()}
      onBuscarPorNombre={() => navigation.replace('BuscarAlimento', { dia, comida })}
      onCrear={(datos) => navigation.replace('CrearAlimento', { dia, comida, ...datos })}
    />
  );
}

function FotoComidaRuta({ navigation, route }: NativeStackScreenProps<RaizParamList, 'FotoComida'>) {
  const { dia, comida } = route.params;
  return (
    <FotoComidaScreen
      dia={dia}
      comida={comida}
      onVolver={() => navigation.goBack()}
      // Agregado al diario: vuelve a la pestaña Comida.
      onListo={() => navigation.popTo('Tabs')}
    />
  );
}

function CrearAlimentoRuta({ navigation, route }: NativeStackScreenProps<RaizParamList, 'CrearAlimento'>) {
  const { dia, comida, nombre, marca, codigo } = route.params;
  return (
    <CrearAlimentoScreen
      dia={dia}
      comida={comida}
      nombreInicial={nombre}
      marcaInicial={marca}
      codigoInicial={codigo}
      onVolver={() => navigation.goBack()}
      // Agregado al diario: vuelve a la pestaña Comida.
      onListo={() => navigation.popTo('Tabs')}
    />
  );
}

export function Raiz() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colores.fondo },
        headerTintColor: colores.texto,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="Tabs" component={TabsRuta} options={{ headerShown: false }} />
      <Stack.Screen
        name="SesionArmada"
        component={SesionArmadaRuta}
        // Sin encabezado nativo: la pantalla dibuja el suyo respetando el margen de arriba.
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="CrearAlimento" component={CrearAlimentoRuta} options={{ headerShown: false }} />
      <Stack.Screen
        name="SesionEnCurso"
        component={SesionEnCursoRuta}
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="ResumenSesion"
        component={ResumenSesionRuta}
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen
        name="EditarRutina"
        component={EditarRutinaRuta}
        options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <Stack.Screen name="Perfil" component={PerfilRuta} options={{ headerShown: false }} />
      <Stack.Screen name="BuscarAlimento" component={BuscarAlimentoRuta} options={{ headerShown: false }} />
      <Stack.Screen name="FotoComida" component={FotoComidaRuta} options={{ headerShown: false }} />
      <Stack.Screen
        name="EscanearCodigo"
        component={EscanearCodigoRuta}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}
