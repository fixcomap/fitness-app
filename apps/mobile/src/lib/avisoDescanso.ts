// Aviso de fin del descanso cuando la app está en segundo plano: una notificación
// local programada para la hora en que termina. Con la app abierta no se muestra
// (ahí avisa la vibración). Funciona en Expo Go: son notificaciones locales, no push.
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const ID_NOTIFICACION = 'fin-descanso';
const CANAL = 'descanso';

// Con la app en primer plano, la notificación no se muestra.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let canalListo: Promise<unknown> | null = null;

function prepararCanal() {
  if (Platform.OS !== 'android') return Promise.resolve();
  canalListo ??= Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Fin del descanso',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 150, 300],
  });
  return canalListo;
}

// Se pide al empezar una sesión. Si dice que no, sólo queda la vibración.
export async function pedirPermisoAvisos(): Promise<void> {
  try {
    await prepararCanal();
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (!granted && canAskAgain) await Notifications.requestPermissionsAsync();
  } catch {
    // Sin notificaciones la sesión funciona igual.
  }
}

// Programa (o reprograma) el aviso para `fin`. Hay uno solo a la vez.
export async function programarAvisoDescanso(fin: Date): Promise<void> {
  try {
    const segundos = Math.round((fin.getTime() - Date.now()) / 1000);
    await Notifications.cancelScheduledNotificationAsync(ID_NOTIFICACION);
    if (segundos < 1) return;
    await prepararCanal();
    await Notifications.scheduleNotificationAsync({
      identifier: ID_NOTIFICACION,
      content: { title: 'Terminó el descanso', body: 'Vamos con la próxima serie.', sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: segundos, channelId: CANAL },
    });
  } catch {
    // Si no se puede programar, avisa la vibración al volver a la app.
  }
}

export async function cancelarAvisoDescanso(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(ID_NOTIFICACION);
  } catch {
    // Nada que cancelar.
  }
}
