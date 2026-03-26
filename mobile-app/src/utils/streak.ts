import { stateApi } from './stateApi';

const STREAK_KEY = 'streak_data';

interface StreakData {
  currentStreak: number;
  lastOpenDate: string;
  longestStreak: number;
}

const today = () => new Date().toISOString().split('T')[0];

const daysBetween = (a: string, b: string) => {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
};

export const updateStreak = async (): Promise<StreakData> => {
  const data = await stateApi.get<StreakData | null>('progression-state', STREAK_KEY, null);
  const t = today();

  if (!data) {
    const created: StreakData = { currentStreak: 1, lastOpenDate: t, longestStreak: 1 };
    await stateApi.set('progression-state', STREAK_KEY, created);
    return created;
  }

  if (data.lastOpenDate === t) return data;

  const diff = daysBetween(data.lastOpenDate, t);
  const newStreak = diff === 1 ? data.currentStreak + 1 : 1;
  const updated: StreakData = {
    currentStreak: newStreak,
    lastOpenDate: t,
    longestStreak: Math.max(newStreak, data.longestStreak),
  };

  await stateApi.set('progression-state', STREAK_KEY, updated);
  return updated;
};

export const getStreak = async (): Promise<StreakData> => {
  return stateApi.get<StreakData>('progression-state', STREAK_KEY, {
    currentStreak: 0,
    lastOpenDate: '',
    longestStreak: 0,
  });
};
