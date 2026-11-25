import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CatalogoScreen } from '../screens/CatalogoScreen';

export type EntrenoStackParamList = {
  Catalogo: undefined;
};

const Stack = createNativeStackNavigator<EntrenoStackParamList>();

export function EntrenoStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Catalogo" component={CatalogoScreen} />
    </Stack.Navigator>
  );
}
