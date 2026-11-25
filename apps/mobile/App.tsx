import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorDatosDelDia } from './src/estado/DatosDelDia';
import { ProveedorEntreno } from './src/estado/Entreno';
import { Raiz } from './src/navigation/Raiz';
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

export default function App() {
  return (
    <SafeAreaProvider>
      <ProveedorDatosDelDia>
        <ProveedorEntreno>
          <NavigationContainer theme={tema}>
            <Raiz />
          </NavigationContainer>
        </ProveedorEntreno>
      </ProveedorDatosDelDia>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
