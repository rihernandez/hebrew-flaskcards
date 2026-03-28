import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

const isAndroidExpoGo =
  Platform.OS === 'android'
  && (
    (Constants as any).executionEnvironment === 'storeClient'
    || (Constants as any).appOwnership === 'expo'
  );

const getNotificationsModule = () => {
  if (isAndroidExpoGo) {
    return null;
  }
  return require('expo-notifications');
};

const Notifications = getNotificationsModule();

// Expo Go on Android no longer supports remote notifications in recent SDKs.
// Avoid initializing the module there so development can continue without a dev build.
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const NOTIFICATION_ID_KEY = 'daily_notification_id';

const messages = [
  { title: '📚 ¡Hora de estudiar!', body: 'Unos minutos al día hacen la diferencia.' },
  { title: '🔥 ¡No rompas tu racha!', body: 'Practica hoy y mantén tu racha activa.' },
  { title: '✨ Palabra del día te espera', body: 'Abre el app y descubre la palabra de hoy.' },
  { title: '🧠 5 minutos de práctica', body: 'Tu cerebro te lo agradecerá.' },
  { title: '📖 ¡Sigue aprendiendo!', body: 'Cada palabra nueva es un paso adelante.' },
];

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export const checkPermission = async (): Promise<PermissionStatus> => {
  if (!Notifications) return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionStatus;
};

export const requestPermission = async (): Promise<PermissionStatus> => {
  if (!Notifications) return 'undetermined';
  const { status } = await Notifications.requestPermissionsAsync();
  return status as PermissionStatus;
};

export const openAppSettings = () => {
  Linking.openSettings();
};

export const scheduleDailyNotification = async (
  hour: number,
  minute: number,
  userName: string
): Promise<void> => {
  if (!Notifications) return;

  // Cancelar notificación previa
  await cancelDailyNotification();

  const msg = messages[Math.floor(Math.random() * messages.length)];
  const body = userName ? `Hola ${userName}! ${msg.body}` : msg.body;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: msg.title,
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
};

export const cancelDailyNotification = async (): Promise<void> => {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/** Schedules the "learn today's 10 words" notification — fires 2h after study reminder */
export const scheduleMemorizeNotification = async (
  studyHour: number,
  userName: string,
  uiLang: 'he' | 'es' | 'en' = 'he'
): Promise<void> => {
  if (!Notifications) return;

  const hour = (studyHour + 2) % 24;

  const content: Record<'he' | 'es' | 'en', { title: string; body: string }> = {
    he: {
      title: '🧠 למד את 10 המילים של היום',
      body: userName ? `${userName}, יש לך 10 מילים חדשות לשנן היום!` : 'יש לך 10 מילים חדשות לשנן היום!',
    },
    es: {
      title: '🧠 Aprende las 10 palabras de hoy',
      body: userName ? `${userName}, ¡tienes 10 palabras nuevas para memorizar hoy!` : '¡Tienes 10 palabras nuevas para memorizar hoy!',
    },
    en: {
      title: '🧠 Learn today\'s 10 words',
      body: userName ? `${userName}, you have 10 new words to memorize today!` : 'You have 10 new words to memorize today!',
    },
  };

  await Notifications.scheduleNotificationAsync({
    content: { ...content[uiLang], sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
    },
  });
};
