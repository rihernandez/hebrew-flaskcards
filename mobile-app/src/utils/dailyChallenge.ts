import { Word } from '../types/Word';
import { getDueCards } from './srs';
import { getErrors } from './errorHistory';
import { stateApi } from './stateApi';

const KEY = 'daily_challenge';
const HISTORY_KEY = 'daily_challenge_history';

export type ChallengeType = 'quiz' | 'write' | 'review_errors';

export interface DailyChallenge {
  date: string;
  type: ChallengeType;
  words: Word[];
  completed: boolean;
  correct?: number;
  incorrect?: number;
  memorizeRead: boolean;
  memorizeCompleted: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

const getChallengeType = (hasErrors: boolean): ChallengeType => {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return hasErrors ? 'review_errors' : 'quiz';
  if (day === 2 || day === 4) return 'write';
  return 'quiz';
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export const getDailyChallenge = async (
  language: string,
  allWords: Word[]
): Promise<DailyChallenge> => {
  const existing = await stateApi.get<DailyChallenge | null>('progression-state', KEY, null);
  if (existing && existing.date === today()) return existing;

  const dueKeys = await getDueCards(language);
  const errorWords = await getErrors(language);
  const hasErrors = errorWords.length > 0;
  const type = getChallengeType(hasErrors);

  let pool: Word[] = [];

  if (type === 'review_errors' && hasErrors) {
    pool = shuffle(errorWords).slice(0, 10);
  } else {
    const dueWords = allWords.filter(w =>
      w.language === language &&
      !['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)'].includes(w.topic) &&
      dueKeys.includes(`${w.language}_${w.word}_${w.topic}`)
    );
    const otherWords = allWords.filter(w =>
      w.language === language &&
      !['Gramática', 'Raíz', 'Frases útiles', 'Expresiones Idiomáticas (Nivim)'].includes(w.topic) &&
      !dueKeys.includes(`${w.language}_${w.word}_${w.topic}`)
    );
    pool = [...shuffle(dueWords), ...shuffle(otherWords)].slice(0, 10);
  }

  const challenge: DailyChallenge = {
    date: today(),
    type,
    words: pool,
    completed: false,
    memorizeRead: false,
    memorizeCompleted: false,
  };

  await stateApi.set('progression-state', KEY, challenge);
  return challenge;
};

export const completeDailyChallenge = async (correct: number, incorrect: number): Promise<void> => {
  const challenge = await stateApi.get<DailyChallenge | null>('progression-state', KEY, null);
  if (!challenge) return;

  const updated = { ...challenge, completed: true, correct, incorrect };
  await stateApi.set('progression-state', KEY, updated);

  const history = await stateApi.get<DailyChallenge[]>('progression-state', HISTORY_KEY, []);
  history.push(updated);
  const trimmed = history.slice(-180);
  await stateApi.set('progression-state', HISTORY_KEY, trimmed);
};

export const markMemorizeRead = async (): Promise<void> => {
  const challenge = await stateApi.get<DailyChallenge | null>('progression-state', KEY, null);
  if (!challenge) return;
  await stateApi.set('progression-state', KEY, { ...challenge, memorizeRead: true });
};

export const markMemorizeCompleted = async (): Promise<void> => {
  const challenge = await stateApi.get<DailyChallenge | null>('progression-state', KEY, null);
  if (!challenge) return;
  await stateApi.set('progression-state', KEY, { ...challenge, memorizeCompleted: true });
};

export const getYesterdayWords = async (): Promise<Word[] | null> => {
  const history = await stateApi.get<DailyChallenge[]>('progression-state', HISTORY_KEY, []);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toISOString().slice(0, 10);
  const entry = history.find(h => h.date === yDate);
  return entry?.words ?? null;
};

export const getChallengeHistory = async (): Promise<DailyChallenge[]> => {
  return stateApi.get<DailyChallenge[]>('progression-state', HISTORY_KEY, []);
};

export const getCompletedStreak = async (): Promise<number> => {
  const history = await getChallengeHistory();
  if (history.length === 0) return 0;
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  let cursor = today();
  for (const entry of sorted) {
    if (entry.date === cursor && entry.completed) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
};
