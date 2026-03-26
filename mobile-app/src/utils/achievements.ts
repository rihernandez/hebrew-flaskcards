import { stateApi } from './stateApi';

const KEY = 'achievements';

export interface Achievement {
  id: string;
  emoji: string;
  titleHe: string;
  titleEs: string;
  titleEn: string;
  descHe: string;
  descEs: string;
  descEn: string;
  unlockedAt?: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_word',
    emoji: '🌱',
    titleHe: 'צעד ראשון', titleEs: 'Primer paso', titleEn: 'First step',
    descHe: 'למדת את המילה הראשונה שלך', descEs: 'Aprendiste tu primera palabra', descEn: 'You learned your first word',
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    titleHe: '3 ימים ברצף', titleEs: '3 días seguidos', titleEn: '3-day streak',
    descHe: 'פתחת את האפליקציה 3 ימים ברצף', descEs: 'Abriste la app 3 días seguidos', descEn: 'Opened the app 3 days in a row',
  },
  {
    id: 'streak_7',
    emoji: '🏆',
    titleHe: 'שבוע שלם!', titleEs: '¡Una semana!', titleEn: 'Full week!',
    descHe: '7 ימים ברצף - מדהים!', descEs: '7 días seguidos — ¡increíble!', descEn: '7 days in a row — amazing!',
  },
  {
    id: 'streak_30',
    emoji: '👑',
    titleHe: 'חודש שלם!', titleEs: '¡Un mes!', titleEn: 'Full month!',
    descHe: '30 ימים ברצף - אלוף!', descEs: '30 días seguidos — ¡campeón!', descEn: '30 days in a row — champion!',
  },
  {
    id: 'words_10',
    emoji: '📚',
    titleHe: '10 מילים', titleEs: '10 palabras', titleEn: '10 words',
    descHe: 'סקרת 10 מילים', descEs: 'Revisaste 10 palabras', descEn: 'Reviewed 10 words',
  },
  {
    id: 'words_50',
    emoji: '📖',
    titleHe: '50 מילים', titleEs: '50 palabras', titleEn: '50 words',
    descHe: 'סקרת 50 מילים', descEs: 'Revisaste 50 palabras', descEn: 'Reviewed 50 words',
  },
  {
    id: 'words_100',
    emoji: '🎓',
    titleHe: '100 מילים!', titleEs: '¡100 palabras!', titleEn: '100 words!',
    descHe: 'סקרת 100 מילים - מרשים!', descEs: '¡Revisaste 100 palabras!', descEn: 'Reviewed 100 words!',
  },
  {
    id: 'quiz_perfect',
    emoji: '💯',
    titleHe: 'מושלם!', titleEs: '¡Perfecto!', titleEn: 'Perfect!',
    descHe: 'ענית נכון על כל השאלות בחידון', descEs: 'Respondiste todo el quiz sin errores', descEn: 'Answered the entire quiz without errors',
  },
  {
    id: 'topic_complete',
    emoji: '✅',
    titleHe: 'נושא הושלם', titleEs: 'Tema completado', titleEn: 'Topic completed',
    descHe: 'ראית את כל המילים בנושא', descEs: 'Viste todas las palabras de un tema', descEn: 'Saw all words in a topic',
  },
  {
    id: 'favorites_5',
    emoji: '⭐',
    titleHe: '5 מועדפים', titleEs: '5 favoritos', titleEn: '5 favorites',
    descHe: 'שמרת 5 מילים מועדפות', descEs: 'Guardaste 5 palabras favoritas', descEn: 'Saved 5 favorite words',
  },
  {
    id: 'challenge_1',
    emoji: '🎯',
    titleHe: 'אתגר ראשון!', titleEs: '¡Primer reto!', titleEn: 'First challenge!',
    descHe: 'השלמת את האתגר היומי הראשון שלך', descEs: 'Completaste tu primer reto diario', descEn: 'Completed your first daily challenge',
  },
  {
    id: 'challenge_7',
    emoji: '🗓️',
    titleHe: '7 אתגרים ברצף', titleEs: '7 retos seguidos', titleEn: '7 challenges in a row',
    descHe: 'השלמת 7 אתגרים יומיים ברצף', descEs: 'Completaste 7 retos diarios seguidos', descEn: 'Completed 7 daily challenges in a row',
  },
  {
    id: 'challenge_30',
    emoji: '🏅',
    titleHe: '30 אתגרים!', titleEs: '¡30 retos!', titleEn: '30 challenges!',
    descHe: 'השלמת 30 אתגרים יומיים', descEs: 'Completaste 30 retos diarios', descEn: 'Completed 30 daily challenges',
  },
  {
    id: 'challenge_60',
    emoji: '🥈',
    titleHe: '60 אתגרים!', titleEs: '¡60 retos!', titleEn: '60 challenges!',
    descHe: 'השלמת 60 אתגרים יומיים', descEs: 'Completaste 60 retos diarios', descEn: 'Completed 60 daily challenges',
  },
  {
    id: 'challenge_90',
    emoji: '🥇',
    titleHe: '90 אתגרים!', titleEs: '¡90 retos!', titleEn: '90 challenges!',
    descHe: 'השלמת 90 אתגרים יומיים', descEs: 'Completaste 90 retos diarios', descEn: 'Completed 90 daily challenges',
  },
  {
    id: 'challenge_120',
    emoji: '💎',
    titleHe: '120 אתגרים!', titleEs: '¡120 retos!', titleEn: '120 challenges!',
    descHe: 'השלמת 120 אתגרים יומיים', descEs: 'Completaste 120 retos diarios', descEn: 'Completed 120 daily challenges',
  },
  {
    id: 'challenge_150',
    emoji: '🔮',
    titleHe: '150 אתגרים!', titleEs: '¡150 retos!', titleEn: '150 challenges!',
    descHe: 'השלמת 150 אתגרים יומיים', descEs: 'Completaste 150 retos diarios', descEn: 'Completed 150 daily challenges',
  },
  {
    id: 'challenge_180',
    emoji: '👑',
    titleHe: '180 אתגרים - אגדה!', titleEs: '¡180 retos — leyenda!', titleEn: '180 challenges — legend!',
    descHe: 'השלמת 180 אתגרים יומיים - אתה אגדה!', descEs: '¡Completaste 180 retos — eres una leyenda!', descEn: 'Completed 180 daily challenges — you\'re a legend!',
  },
];

export const getUnlocked = async (): Promise<Record<string, string>> => {
  return stateApi.get<Record<string, string>>('progression-state', KEY, {});
};

export const unlockAchievement = async (id: string): Promise<boolean> => {
  const unlocked = await getUnlocked();
  if (unlocked[id]) return false;
  unlocked[id] = new Date().toISOString();
  await stateApi.set('progression-state', KEY, unlocked);
  return true;
};

export const checkAchievements = async (params: {
  streak?: number;
  totalSeen?: number;
  quizPerfect?: boolean;
  topicComplete?: boolean;
  favoritesCount?: number;
  challengeCompleted?: boolean;
  challengeStreak?: number;
}): Promise<Achievement[]> => {
  const newly: Achievement[] = [];

  const check = async (id: string) => {
    const isNew = await unlockAchievement(id);
    if (isNew) {
      const a = ALL_ACHIEVEMENTS.find(x => x.id === id);
      if (a) newly.push(a);
    }
  };

  if ((params.totalSeen ?? 0) >= 1) await check('first_word');
  if ((params.totalSeen ?? 0) >= 10) await check('words_10');
  if ((params.totalSeen ?? 0) >= 50) await check('words_50');
  if ((params.totalSeen ?? 0) >= 100) await check('words_100');
  if ((params.streak ?? 0) >= 3) await check('streak_3');
  if ((params.streak ?? 0) >= 7) await check('streak_7');
  if ((params.streak ?? 0) >= 30) await check('streak_30');
  if (params.quizPerfect) await check('quiz_perfect');
  if (params.topicComplete) await check('topic_complete');
  if ((params.favoritesCount ?? 0) >= 5) await check('favorites_5');
  if (params.challengeCompleted) await check('challenge_1');
  if ((params.challengeStreak ?? 0) >= 7) await check('challenge_7');
  if ((params.challengeStreak ?? 0) >= 30) await check('challenge_30');
  if ((params.challengeStreak ?? 0) >= 60) await check('challenge_60');
  if ((params.challengeStreak ?? 0) >= 90) await check('challenge_90');
  if ((params.challengeStreak ?? 0) >= 120) await check('challenge_120');
  if ((params.challengeStreak ?? 0) >= 150) await check('challenge_150');
  if ((params.challengeStreak ?? 0) >= 180) await check('challenge_180');

  return newly;
};

export const clearAchievements = async (): Promise<void> => {
  await stateApi.remove('progression-state', KEY);
};
