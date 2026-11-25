import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PantallaTitulo } from '../screens/PantallaTitulo';

export type EntrenoStackParamList = {
  Catalogo: undefined;
};

const Stack = createNativeStackNavigator<EntrenoStackParamList>();

const Catalogo = () => <PantallaTitulo titulo="Entreno" />;

export function EntrenoStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Catalogo" component={Catalogo} />
    </Stack.Navigator>
  );
}
