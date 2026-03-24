import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'streak_data';

interface StreakData {
  currentStreak: number;
  lastOpenDate: string; // YYYY-MM-DD
  longestStreak: number;
}

const today = () => new Date().toISOString().split('T')[0];

const daysBetween = (a: string, b: string) => {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

export const updateStreak = async (): Promise<StreakData> => {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  const t = today();

  if (!raw) {
    const data: StreakData = { currentStreak: 1, lastOpenDate: t, longestStreak: 1 };
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(data));
    return data;
  }

  const data: StreakData = JSON.parse(raw);

  if (data.lastOpenDate === t) return data; // already counted today

  const diff = daysBetween(data.lastOpenDate, t);
  const newStreak = diff === 1 ? data.currentStreak + 1 : 1;
  const longest = Math.max(newStreak, data.longestStreak);
  const updated: StreakData = { currentStreak: newStreak, lastOpenDate: t, longestStreak: longest };
  await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updated));
  return updated;
};

export const getStreak = async (): Promise<StreakData> => {
  const raw = await AsyncStorage.getItem(STREAK_KEY);
  if (!raw) return { currentStreak: 0, lastOpenDate: '', longestStreak: 0 };
  return JSON.parse(raw);
};
