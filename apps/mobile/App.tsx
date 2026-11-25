import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Tabs } from './src/navigation/Tabs';
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
      <NavigationContainer theme={tema}>
        <Tabs />
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
