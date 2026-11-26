import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorDatosDelDia } from './src/estado/DatosDelDia';
import { ProveedorEntreno } from './src/estado/Entreno';
import { ProveedorPerfil, usePerfil } from './src/estado/Perfil';
import { Raiz } from './src/navigation/Raiz';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { colores } from './src/theme/tema';

const tema: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colores.acento,
    background: colores.fondo,
    card: colores.fondo,
    text: colores.texto,
    border: colores.borde,
  },
};

// Sin perfil guardado (primera vez), el onboarding; con perfil, la app.
function Puerta() {
  const { listo, perfil, guardar } = usePerfil();
  if (!listo) return <View style={{ flex: 1, backgroundColor: colores.fondo }} />;
  if (!perfil) return <OnboardingScreen onListo={guardar} />;
  return (
    <ProveedorDatosDelDia>
      <ProveedorEntreno>
        <NavigationContainer theme={tema}>
          <Raiz />
        </NavigationContainer>
      </ProveedorEntreno>
    </ProveedorDatosDelDia>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProveedorPerfil>
        <Puerta />
      </ProveedorPerfil>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
