import { Word } from '../types/Word';
import { stateApi } from './stateApi';

const KEY = 'error_history';

export const addErrors = async (words: Word[]): Promise<void> => {
  if (words.length === 0) return;
  const existing = await stateApi.get<Word[]>('learning-state', KEY, []);
  const keys = new Set(existing.map(w => `${w.language}_${w.word}_${w.topic}`));
  const toAdd = words.filter(w => !keys.has(`${w.language}_${w.word}_${w.topic}`));
  await stateApi.set('learning-state', KEY, [...existing, ...toAdd]);
};

export const getErrors = async (language?: string): Promise<Word[]> => {
  const all = await stateApi.get<Word[]>('learning-state', KEY, []);
  return language ? all.filter(w => w.language === language) : all;
};

export const clearErrors = async (language?: string): Promise<void> => {
  if (!language) {
    await stateApi.remove('learning-state', KEY);
    return;
  }
  const all = await stateApi.get<Word[]>('learning-state', KEY, []);
  await stateApi.set('learning-state', KEY, all.filter(w => w.language !== language));
};

export const getErrorCount = async (language?: string): Promise<number> => {
  const errors = await getErrors(language);
  return errors.length;
};
