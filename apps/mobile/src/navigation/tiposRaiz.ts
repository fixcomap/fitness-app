// Tipos de la navegación de arriba de todo (ver Raiz.tsx). Están aparte para que
// las pantallas anidadas los usen sin importar Raiz (que importa a las pestañas).
import { useNavigation, type NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { TabsParamList } from './Tabs';

export type RaizParamList = {
  Tabs: NavigatorScreenParams<TabsParamList> | undefined;
  SesionArmada: undefined;
  SesionEnCurso: undefined;
  ResumenSesion: { id: string };
};

export type NavegacionRaiz = NativeStackNavigationProp<RaizParamList>;

// Navegar a las pantallas de la sesión desde cualquier pestaña.
export function useNavegacionRaiz(): NavegacionRaiz {
  return useNavigation<NavegacionRaiz>();
}
