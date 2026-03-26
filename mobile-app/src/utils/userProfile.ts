import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, clearToken, getToken } from './apiClient';
import { stateApi } from './stateApi';

const KEY = 'user_profile';

export interface UserProfile {
  // local fields
  name: string;
  email: string;
  nativeLanguage: string;
  learningLanguage: string;
  notificationHour: number;
  notificationMinute: number;
  createdAt: string;
  isAdvanced: boolean;
  speakingUnlocked: boolean;
  // remote fields
  remoteId?: string;
  token?: string;
}

export const getProfile = async (): Promise<UserProfile | null> => {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  const profile: UserProfile = JSON.parse(raw);
  // if we have a token stored separately, attach it
  const token = await getToken();
  if (token) profile.token = token;
  return profile;
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  // store token separately for security, keep rest in profile
  if (profile.token) {
    await saveToken(profile.token);
  }
  const { token, ...rest } = profile;
  await AsyncStorage.setItem(KEY, JSON.stringify(rest));
};

export const updateProfile = async (partial: Partial<UserProfile>): Promise<void> => {
  const current = await getProfile();
  if (!current) return;
  await saveProfile({ ...current, ...partial });
};

export const clearProfile = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
  await clearToken();
};

export const fakeProfile = async (simulateDays = 0): Promise<null> => {
  await AsyncStorage.clear();
  await clearToken();

  if (simulateDays > 0) {
    const history = [];
    for (let i = simulateDays; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      history.push({
        date: d.toISOString().slice(0, 10),
        type: 'quiz',
        words: [],
        completed: true,
        memorizeRead: true,
        memorizeCompleted: true,
      });
    }
    await AsyncStorage.setItem('daily_challenge_history', JSON.stringify(history));
  }

  return null;
};

export const clearLanguageProgress = async (language: string): Promise<void> => {
  // Remote learning-state cleanup
  const learningRows = await stateApi.list<{ key: string; value: any }[]>('learning-state')
    .catch(() => []);
  const learningKeys = learningRows
    .map(r => r.key)
    .filter(k =>
      k.startsWith(`seen_${language}_`) ||
      k.startsWith(`activity_results_${language}`) ||
      k === 'favorites' ||
      k === 'error_history' ||
      k === 'traduccion_errors',
    );
  await Promise.all(learningKeys.map(k => stateApi.remove('learning-state', k).catch(() => {})));

  // Remote progression-state cleanup
  await Promise.all([
    stateApi.remove('progression-state', 'streak_data').catch(() => {}),
    stateApi.remove('progression-state', 'srs_data').catch(() => {}),
    stateApi.remove('progression-state', 'daily_challenge').catch(() => {}),
    stateApi.remove('progression-state', 'daily_challenge_history').catch(() => {}),
    stateApi.remove('progression-state', 'achievements').catch(() => {}),
  ]);

  // Keep local backward-cleanup for any legacy values
  const allKeys = await AsyncStorage.getAllKeys();
  const toDelete = allKeys.filter(k =>
    k.startsWith(`seen_${language}_`) ||
    k.startsWith(`shown_`) ||
    k === 'favorites' ||
    k === 'error_history' ||
    k === 'streak_data' ||
    k === 'srs_data' ||
    k === 'daily_challenge' ||
    k === 'daily_challenge_history' ||
    k === 'achievements'
  );
  if (toDelete.length > 0) await AsyncStorage.multiRemove(toDelete);
};
